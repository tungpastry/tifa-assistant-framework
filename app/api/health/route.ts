import { NextResponse } from "next/server";
import fs from "fs/promises";
import { getRuntimeDir, getDailyVibesDir, getRuntimeLogsDir } from "@/lib/runtime";
import { parseTimeoutMs } from "@/lib/api";

type Status = "ok" | "degraded" | "down";

interface Check {
  status: Status;
  details: Record<string, unknown>;
}

async function checkRuntime(): Promise<Check> {
  const details: Record<string, unknown> = {};
  let status: Status = "ok";

  try {
    const dirs = [getRuntimeDir(), getDailyVibesDir(), getRuntimeLogsDir()];
    details.dirs_checked = dirs;
    await Promise.all(dirs.map(dir => fs.access(dir)));
  } catch (error) {
    status = "down";
    details.error = error instanceof Error ? error.message : String(error);
  }

  return { status, details };
}

async function checkOllama(): Promise<Check> {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (!ollamaUrl) {
    return { status: "degraded", details: { error: "OLLAMA_URL not configured." } };
  }

  const controller = new AbortController();
  const timeout = parseTimeoutMs(process.env.HEALTH_TIMEOUT_MS, 1500);
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { status: "down", details: { url: ollamaUrl, error: `API returned ${res.status}` } };
    }
    const data = await res.json();
    return { status: "ok", details: { url: ollamaUrl, models: data.models.length } };
  } catch (error) {
    clearTimeout(timeoutId);
    return { status: "down", details: { url: ollamaUrl, error: error instanceof Error ? error.message : String(error) } };
  }
}

async function checkPiper(): Promise<Check> {
  const piperBin = process.env.PIPER_BIN;
  const piperModel = process.env.PIPER_MODEL;
  const details: Record<string, unknown> = { bin: piperBin, model: piperModel };
  let status: Status = "ok";

  if (!piperBin || !piperModel) {
    return { status: "degraded", details: { ...details, error: "PIPER_BIN or PIPER_MODEL not configured." } };
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

  return { status, details };
}

export async function GET() {
  const checks = await Promise.all([
    checkRuntime(),
    checkOllama(),
    checkPiper(),
  ]);

  const [runtime, ollama, piper] = checks;

  const overallStatus: Status = checks.some(c => c.status === "down")
    ? "down"
    : checks.some(c => c.status === "degraded")
    ? "degraded"
    : "ok";

  const httpStatus = overallStatus === "down" ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      service: "tradevibe",
      timestamp: new Date().toISOString(),
      checks: { runtime, ollama, piper },
    },
    { status: httpStatus }
  );
}
