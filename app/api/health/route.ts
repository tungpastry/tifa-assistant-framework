import { NextResponse } from "next/server";
import fs from "fs/promises";
import {
  getRuntimeDir,
  getRuntimeLogsDir,
  getAudioCacheDir,
  getTtsJobsDir,
  getChatSessionsDir,
} from "@/lib/runtime";
import { parseTimeoutMs } from "@/lib/api";
import { createPostgresFinancialConnector } from "@/lib/data-connectors/postgres";
import { createProviderGatewayProviders, getProviderFallbackOrder } from "@/lib/tifa-provider-gateway";
import { getTtsWorkerStatus } from "@/lib/tts-worker-status";
import { createLocalAssistantConfig } from "@/lib/framework/config";

type Status = "ok" | "degraded" | "disabled" | "down";

interface Check {
  status: Status;
  details: Record<string, unknown>;
  required?: boolean;
}

async function checkRuntime(): Promise<Check> {
  const details: Record<string, unknown> = {};
  let status: Status = "ok";

  try {
    const dirs = [
      getRuntimeDir(),
      getRuntimeLogsDir(),
      getAudioCacheDir(),
      getTtsJobsDir(),
      getChatSessionsDir(),
    ];
    details.dirs_checked = dirs;
    await Promise.all(dirs.map((dir) => fs.access(dir)));
  } catch (error) {
    status = "down";
    details.error = error instanceof Error ? error.message : String(error);
  }

  return { status, details, required: true };
}

async function checkOllama(): Promise<Check> {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (!ollamaUrl) {
    return { status: "degraded", details: { error: "OLLAMA_URL not configured." }, required: true };
  }

  const controller = new AbortController();
  const timeout = parseTimeoutMs(process.env.HEALTH_TIMEOUT_MS, 1500);
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { status: "down", details: { url: ollamaUrl, error: `API returned ${res.status}` }, required: true };
    }
    const data = await res.json();
    return { status: "ok", details: { url: ollamaUrl, models: data.models.length }, required: true };
  } catch (error) {
    clearTimeout(timeoutId);
    return { status: "down", details: { url: ollamaUrl, error: error instanceof Error ? error.message : String(error) }, required: true };
  }
}

async function checkPiper(): Promise<Check> {
  const piperBin = process.env.PIPER_BIN;
  const piperModel = process.env.PIPER_MODEL;
  const details: Record<string, unknown> = { bin: piperBin, model: piperModel };
  let status: Status = "ok";

  if (!piperBin || !piperModel) {
    return { status: "degraded", details: { ...details, error: "PIPER_BIN or PIPER_MODEL not configured." }, required: true };
  }

  try {
    await fs.access(piperBin, fs.constants.X_OK);
  } catch {
    status = "down";
    details.bin_error = `File not found or not executable: ${piperBin}`;
  }

  try {
    await fs.access(piperModel, fs.constants.R_OK);
  } catch {
    status = status === 'down' ? 'down' : 'degraded';
    details.model_error = `File not found or not readable: ${piperModel}`;
  }

  return { status, details, required: true };
}

async function checkTtsWorker(): Promise<Check> {
  const workerStatus = await getTtsWorkerStatus();

  return {
    status: workerStatus.status,
    details: {
      heartbeat: workerStatus.heartbeat,
      heartbeat_age_ms: workerStatus.heartbeat_age_ms,
      stale_after_ms: workerStatus.stale_after_ms,
      queue: workerStatus.queue,
      ...workerStatus.details,
    },
    required: false,
  };
}

async function checkPostgresConnector(): Promise<Check> {
  const connector = createPostgresFinancialConnector();
  const health = await connector.health();

  return {
    status: health.status,
    details: health.details ?? {},
    required: false,
  };
}

async function checkRedis(): Promise<Check> {
  if (process.env.TIFA_REDIS_ENABLED !== "1") {
    return {
      status: "disabled",
      details: { reason: "TIFA_REDIS_ENABLED is not 1." },
      required: false,
    };
  }

  return {
    status: process.env.TIFA_REDIS_URL ? "degraded" : "down",
    details: {
      url_configured: Boolean(process.env.TIFA_REDIS_URL),
      note: "Redis health is a placeholder until a Redis client is wired.",
    },
    required: false,
  };
}

async function checkObjectStorage(): Promise<Check> {
  if (process.env.TIFA_OBJECT_STORAGE_ENABLED !== "1") {
    return {
      status: "disabled",
      details: { reason: "TIFA_OBJECT_STORAGE_ENABLED is not 1." },
      required: false,
    };
  }

  return {
    status: "degraded",
    details: {
      note: "Object storage health is a placeholder until a storage client is wired.",
    },
    required: false,
  };
}

async function checkProviderGateway(): Promise<Check> {
  const assistantConfig = createLocalAssistantConfig();
  const providers = createProviderGatewayProviders({
    policy: assistantConfig.modelPolicy.routingMode,
    fallbackOrder: assistantConfig.modelPolicy.fallbackOrder,
    defaultProvider: assistantConfig.modelPolicy.defaultProvider,
    defaultModel: assistantConfig.modelPolicy.defaultModel,
  });
  const providerHealth = await Promise.all(providers.map((provider) => provider.health()));
  const requiredProvider = providerHealth.find((provider) => provider.provider === assistantConfig.modelPolicy.defaultProvider)
    ?? providerHealth[0];
  const status: Status = requiredProvider?.status === "ok"
    ? "ok"
    : providerHealth.some((provider) => provider.status === "ok")
    ? "degraded"
    : "disabled";

  return {
    status,
    details: {
      scaffold: false,
      policies: ["local-first", "cloud-first", "cost-aware", "privacy-first"],
      active_policy: assistantConfig.modelPolicy.routingMode,
      fallback_order: getProviderFallbackOrder({
        policy: assistantConfig.modelPolicy.routingMode,
        fallbackOrder: assistantConfig.modelPolicy.fallbackOrder,
      }),
      providers: providerHealth,
    },
    required: false,
  };
}

async function checkTextToSql(): Promise<Check> {
  if (process.env.TIFA_TEXT_TO_SQL_ENABLED !== "1") {
    return {
      status: "disabled",
      details: { reason: "TIFA_TEXT_TO_SQL_ENABLED is not 1." },
      required: false,
    };
  }

  return {
    status: "ok",
    details: { scaffold: true, execution: "guarded" },
    required: false,
  };
}

export async function GET() {
  const checks = await Promise.all([
    checkRuntime(),
    checkOllama(),
    checkPiper(),
    checkTtsWorker(),
    checkPostgresConnector(),
    checkRedis(),
    checkObjectStorage(),
    checkProviderGateway(),
    checkTextToSql(),
  ]);

  const [runtime, ollama, piper, ttsWorker, postgres, redis, objectStorage, providerGateway, textToSql] = checks;
  const requiredChecks = checks.filter((check) => check.required);

  const overallStatus: Status = requiredChecks.some(c => c.status === "down")
    ? "down"
    : checks.some(c => c.status === "degraded")
    ? "degraded"
    : "ok";

  const httpStatus = overallStatus === "down" ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      service: "tifa-assistant-framework",
      timestamp: new Date().toISOString(),
      checks: {
        runtime,
        ollama,
        piper,
        tts_worker: ttsWorker,
        postgres,
        redis,
        object_storage: objectStorage,
        provider_gateway: providerGateway,
        text_to_sql: textToSql,
      },
    },
    { status: httpStatus }
  );
}
