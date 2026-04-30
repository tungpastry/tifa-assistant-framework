import fs from "fs/promises";
import path from "path";
import { getTtsJobsDir, getTtsWorkerHeartbeatPath } from "@/lib/runtime";

export type TtsJobStatus = "queued" | "processing" | "ready" | "failed" | "unknown";

export interface TtsQueueStats {
  total: number;
  queued: number;
  processing: number;
  ready: number;
  failed: number;
  unknown: number;
}

export interface TtsWorkerHeartbeat {
  status: string;
  pid: number;
  updated_at: string;
  processed_last_tick: number;
  queue_depth: number;
  runtime_dir: string;
  audio_cache_dir: string;
  tts_jobs_dir: string;
}

export interface TtsWorkerStatus {
  status: "ok" | "degraded" | "disabled";
  heartbeat: TtsWorkerHeartbeat | null;
  heartbeat_age_ms: number | null;
  stale_after_ms: number;
  queue: TtsQueueStats;
  details: Record<string, unknown>;
}

const DEFAULT_STALE_AFTER_MS = 30000;

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeJobStatus(status: unknown): TtsJobStatus {
  if (
    status === "queued" ||
    status === "processing" ||
    status === "ready" ||
    status === "failed"
  ) {
    return status;
  }

  return "unknown";
}

export async function readTtsQueueStats(): Promise<TtsQueueStats> {
  const stats: TtsQueueStats = {
    total: 0,
    queued: 0,
    processing: 0,
    ready: 0,
    failed: 0,
    unknown: 0,
  };

  let entries;
  try {
    entries = await fs.readdir(getTtsJobsDir(), { withFileTypes: true });
  } catch {
    return stats;
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile() || !entry.name.endsWith(".json")) return;

      try {
        const data = await fs.readFile(path.join(getTtsJobsDir(), entry.name), "utf-8");
        const job = JSON.parse(data) as { status?: unknown };
        const status = normalizeJobStatus(job.status);
        stats.total += 1;
        stats[status] += 1;
      } catch {
        stats.total += 1;
        stats.unknown += 1;
      }
    })
  );

  return stats;
}

export async function readTtsWorkerHeartbeat(): Promise<TtsWorkerHeartbeat | null> {
  try {
    const data = await fs.readFile(getTtsWorkerHeartbeatPath(), "utf-8");
    return JSON.parse(data) as TtsWorkerHeartbeat;
  } catch {
    return null;
  }
}

export async function getTtsWorkerStatus(): Promise<TtsWorkerStatus> {
  const [queue, heartbeat] = await Promise.all([
    readTtsQueueStats(),
    readTtsWorkerHeartbeat(),
  ]);
  const staleAfterMs = parsePositiveInt(
    process.env.TIFA_TTS_WORKER_HEARTBEAT_STALE_MS,
    DEFAULT_STALE_AFTER_MS
  );
  const heartbeatAgeMs = heartbeat
    ? Date.now() - Date.parse(heartbeat.updated_at)
    : null;
  const hasActiveQueue = queue.queued > 0 || queue.processing > 0;
  const isStale = heartbeatAgeMs === null || heartbeatAgeMs > staleAfterMs;
  const status = heartbeat && !isStale
    ? "ok"
    : hasActiveQueue
    ? "degraded"
    : "disabled";

  return {
    status,
    heartbeat,
    heartbeat_age_ms: heartbeatAgeMs,
    stale_after_ms: staleAfterMs,
    queue,
    details: {
      heartbeat_path: getTtsWorkerHeartbeatPath(),
      active_queue_requires_worker: hasActiveQueue,
      stale: isStale,
    },
  };
}

