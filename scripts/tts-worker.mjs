#!/usr/bin/env node
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const runtimeDir = process.env.TIFA_RUNTIME_DIR || process.env.TRADEVIBE_RUNTIME_DIR || path.join(rootDir, "runtime");
const audioCacheDir = path.join(runtimeDir, "audio_cache");
const ttsJobsDir = path.join(runtimeDir, "tts_jobs");
const heartbeatPath = path.join(runtimeDir, "tts_worker_heartbeat.json");
const intervalMs = parsePositiveInt(
  process.env.TIFA_TTS_WORKER_INTERVAL_MS || process.env.TRADEVIBE_TTS_WORKER_INTERVAL_MS,
  1000
);
const piperTimeoutMs = parsePositiveInt(process.env.PIPER_TIMEOUT_MS, 10000);
const once = process.argv.includes("--once");

function parsePositiveInt(value, fallback) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(text) {
  return String(text || "").trim();
}

function getVoiceIdentity() {
  const modelPath = process.env.PIPER_MODEL || "/home/nexus/piper/voices/en_US-libritts-high.onnx";
  return {
    voice: "tifa-default",
    modelPath,
    modelName: path.basename(modelPath),
    piperBin: process.env.PIPER_BIN || "/home/nexus/piper-env/bin/piper",
  };
}

function createTtsCacheKey(input) {
  const identity = getVoiceIdentity();
  const text = normalizeText(input.text);
  const voice = input.voice || identity.voice;
  const modelPath = input.modelPath || identity.modelPath;
  const format = input.format || "wav";
  return crypto
    .createHash("sha256")
    .update(`${text}|${voice}|${modelPath}|${format}`)
    .digest("hex");
}

function getJobPath(jobId) {
  return path.join(ttsJobsDir, `${jobId}.json`);
}

function getAudioPath(cacheKey) {
  return path.join(audioCacheDir, `${cacheKey}.wav`);
}

function getAudioMetaPath(cacheKey) {
  return path.join(audioCacheDir, `${cacheKey}.json`);
}

async function ensureRuntimeDirs() {
  await fs.mkdir(audioCacheDir, { recursive: true });
  await fs.mkdir(ttsJobsDir, { recursive: true });
}

async function readJson(filePath) {
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function listQueuedJobs() {
  await ensureRuntimeDirs();
  const entries = await fs.readdir(ttsJobsDir, { withFileTypes: true });
  const jobs = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const jobPath = path.join(ttsJobsDir, entry.name);
    try {
      const job = await readJson(jobPath);
      if (job.status === "queued") jobs.push(job);
    } catch (error) {
      console.error(`Failed to read ${jobPath}:`, error);
    }
  }

  return jobs.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

async function readQueueStats() {
  await ensureRuntimeDirs();
  const stats = {
    total: 0,
    queued: 0,
    processing: 0,
    ready: 0,
    failed: 0,
    unknown: 0,
  };
  const entries = await fs.readdir(ttsJobsDir, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile() || !entry.name.endsWith(".json")) return;

    try {
      const job = await readJson(path.join(ttsJobsDir, entry.name));
      const status = ["queued", "processing", "ready", "failed"].includes(job.status)
        ? job.status
        : "unknown";
      stats.total += 1;
      stats[status] += 1;
    } catch {
      stats.total += 1;
      stats.unknown += 1;
    }
  }));

  return stats;
}

async function writeHeartbeat(processedLastTick, status = "ok") {
  try {
    const queue = await readQueueStats();
    await writeJson(heartbeatPath, {
      status,
      pid: process.pid,
      updated_at: new Date().toISOString(),
      processed_last_tick: processedLastTick,
      queue_depth: queue.queued,
      queue,
      runtime_dir: runtimeDir,
      audio_cache_dir: audioCacheDir,
      tts_jobs_dir: ttsJobsDir,
    });
  } catch (error) {
    console.warn("Failed to write TTS worker heartbeat:", error);
  }
}

async function updateJob(job) {
  job.updated_at = new Date().toISOString();
  await writeJson(getJobPath(job.job_id), job);
}

async function markFailed(job, error) {
  job.status = "failed";
  job.error = error instanceof Error ? error.message : String(error);
  job.audio_url = null;
  await updateJob(job);
}

async function generateAudio(job) {
  const input = job.input;
  if (!input || !normalizeText(input.text)) {
    throw new Error("Queued voice job is missing input text.");
  }

  const identity = getVoiceIdentity();
  const cacheKey = job.cache_key || createTtsCacheKey(input);
  const cachePath = getAudioPath(cacheKey);
  const metaPath = getAudioMetaPath(cacheKey);

  try {
    await fs.access(cachePath);
    await fs.access(metaPath);
    job.status = "ready";
    job.cache_key = cacheKey;
    job.audio_url = `/api/voice/jobs/${job.job_id}/audio`;
    job.error = null;
    await updateJob(job);
    return;
  } catch {}

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), piperTimeoutMs);
  let tempFile = null;

  try {
    tempFile = path.join(audioCacheDir, `${cacheKey}.${crypto.randomUUID()}.tmp.wav`);

    await new Promise((resolve, reject) => {
      const piperProcess = spawn(
        identity.piperBin,
        ["--model", identity.modelPath, "--output_file", tempFile],
        { signal: controller.signal }
      );

      let stderr = "";
      piperProcess.stderr.on("data", (data) => {
        stderr += data;
      });
      piperProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Piper exited with code ${code}: ${stderr}`));
          return;
        }
        resolve();
      });
      piperProcess.on("error", reject);
      piperProcess.stdin.write(normalizeText(input.text));
      piperProcess.stdin.end();
    });

    await fs.rename(tempFile, cachePath);
    tempFile = null;
    await writeJson(metaPath, {
      text: normalizeText(input.text),
      voice: job.voice || identity.voice,
      model: job.model || identity.modelName,
      created_at: new Date().toISOString(),
      hit_count: 0,
    });

    job.status = "ready";
    job.cache_key = cacheKey;
    job.audio_url = `/api/voice/jobs/${job.job_id}/audio`;
    job.error = null;
    await updateJob(job);
  } finally {
    clearTimeout(timeoutId);
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => undefined);
    }
  }
}

async function processQueuedJob(job) {
  job.status = "processing";
  job.error = null;
  await updateJob(job);

  try {
    await generateAudio(job);
    console.log(`ready ${job.job_id}`);
  } catch (error) {
    await markFailed(job, error);
    console.error(`failed ${job.job_id}:`, error);
  }
}

async function runOnce() {
  const queuedJobs = await listQueuedJobs();
  for (const job of queuedJobs) {
    await processQueuedJob(job);
  }
  await writeHeartbeat(queuedJobs.length);
  return queuedJobs.length;
}

do {
  const processed = await runOnce();
  if (once) {
    console.log(`processed ${processed} queued job(s)`);
    break;
  }
  await sleep(intervalMs);
} while (true);
