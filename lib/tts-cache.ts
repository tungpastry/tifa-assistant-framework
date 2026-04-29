import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { getAudioCacheDir, getTtsJobsDir, ensureRuntimeDirs } from "./runtime";
import { parseTimeoutMs } from "./api";
import { getPiperVoiceRuntimeConfig } from "./voice/providers/piper";

export const MAX_TTS_TEXT_LENGTH = 500;

export type VoiceJobStatus = "queued" | "processing" | "ready" | "failed";

export interface CreateVoiceJobInput {
  text: string;
  voice?: string;
  modelPath?: string;
  format?: string;
}

export interface CreateVoiceJobResult {
  status: VoiceJobStatus;
  cache_hit: boolean;
  job_id: string;
  audio_url: string | null;
  voice: string;
  model: string;
}

export interface VoiceJobRecord {
  job_id: string;
  status: VoiceJobStatus;
  cache_key: string;
  audio_url: string | null;
  error: string | null;
  voice: string;
  model: string;
  input?: CreateVoiceJobInput | null;
  created_at: string;
  updated_at: string;
}

export function normalizeTtsText(text: string): string {
  return text.trim();
}

export function getVoiceIdentity() {
  const config = getPiperVoiceRuntimeConfig();
  return {
    voice: config.voiceId,
    modelPath: config.modelPath,
    modelName: path.basename(config.modelPath),
    piperBin: config.piperBin,
  };
}

export function createTtsCacheKey(input: CreateVoiceJobInput): string {
  const identity = getVoiceIdentity();
  const normalizedText = normalizeTtsText(input.text);
  const voice = input.voice || identity.voice;
  const modelPath = input.modelPath || identity.modelPath;
  const format = input.format || "wav";

  const raw = `${normalizedText}|${voice}|${modelPath}|${format}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function getAudioCachePath(cacheKey: string): string {
  return path.join(getAudioCacheDir(), `${cacheKey}.wav`);
}

export function getAudioCacheMetaPath(cacheKey: string): string {
  return path.join(getAudioCacheDir(), `${cacheKey}.json`);
}

export function getVoiceJobPath(jobId: string): string {
  return path.join(getTtsJobsDir(), `${jobId}.json`);
}

export async function readVoiceJob(jobId: string): Promise<VoiceJobRecord | null> {
  const jobPath = getVoiceJobPath(jobId);
  try {
    const data = await fs.readFile(jobPath, "utf-8");
    return JSON.parse(data) as VoiceJobRecord;
  } catch {
    return null;
  }
}

export async function writeVoiceJob(job: VoiceJobRecord): Promise<void> {
  ensureRuntimeDirs();
  const jobPath = getVoiceJobPath(job.job_id);
  await fs.writeFile(jobPath, JSON.stringify(job, null, 2), "utf-8");
}

export async function createQueuedVoiceJob(
  input: CreateVoiceJobInput,
  jobId: string
): Promise<VoiceJobRecord> {
  ensureRuntimeDirs();
  const identity = getVoiceIdentity();
  const normalizedInput: CreateVoiceJobInput = {
    ...input,
    text: normalizeTtsText(input.text),
  };
  const now = new Date().toISOString();
  const jobRecord: VoiceJobRecord = {
    job_id: jobId,
    status: "queued",
    cache_key: createTtsCacheKey(normalizedInput),
    audio_url: null,
    error: null,
    voice: normalizedInput.voice || identity.voice,
    model: identity.modelName,
    input: normalizedInput,
    created_at: now,
    updated_at: now,
  };

  await writeVoiceJob(jobRecord);
  return jobRecord;
}

export async function readAudioCacheMeta(cacheKey: string): Promise<unknown | null> {
  const metaPath = getAudioCacheMetaPath(cacheKey);
  try {
    const data = await fs.readFile(metaPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeAudioCacheMeta(cacheKey: string, meta: unknown): Promise<void> {
  ensureRuntimeDirs();
  const metaPath = getAudioCacheMetaPath(cacheKey);
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
}

export async function generateVoiceToCache(
  input: CreateVoiceJobInput,
  jobId: string
): Promise<VoiceJobRecord> {
  const cacheKey = createTtsCacheKey(input);
  const cachePath = getAudioCachePath(cacheKey);
  const identity = getVoiceIdentity();
  
  const now = new Date().toISOString();
  const jobRecord: VoiceJobRecord = {
    job_id: jobId,
    status: "processing",
    cache_key: cacheKey,
    audio_url: null,
    error: null,
    voice: input.voice || identity.voice,
    model: identity.modelName,
    input,
    created_at: now,
    updated_at: now,
  };

  await writeVoiceJob(jobRecord);

  const PIPER_TIMEOUT_MS = parseTimeoutMs(process.env.PIPER_TIMEOUT_MS, 10000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PIPER_TIMEOUT_MS);
  let tempFile: string | null = null;

  try {
    const currentTempFile = path.join(getAudioCacheDir(), `${cacheKey}.${crypto.randomUUID()}.tmp.wav`);
    tempFile = currentTempFile;

    await new Promise<void>((resolve, reject) => {
      const piperProcess = spawn(
        identity.piperBin,
        ["--model", identity.modelPath, "--output_file", currentTempFile],
        { signal: controller.signal }
      );

      let stderr = "";
      piperProcess.stderr.on("data", (data) => (stderr += data));

      piperProcess.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(`Piper exited with code ${code}: ${stderr}`));
        }
        resolve();
      });

      piperProcess.on("error", reject);

      piperProcess.stdin.write(normalizeTtsText(input.text));
      piperProcess.stdin.end();
    });

    // Move from temp to cache
    await fs.rename(tempFile, cachePath);
    tempFile = null;

    // Write meta
    await writeAudioCacheMeta(cacheKey, {
      text: normalizeTtsText(input.text),
      voice: jobRecord.voice,
      model: jobRecord.model,
      created_at: now,
      hit_count: 0
    });

    jobRecord.status = "ready";
    jobRecord.audio_url = `/api/voice/jobs/${jobId}/audio`;
    jobRecord.updated_at = new Date().toISOString();
    await writeVoiceJob(jobRecord);

  } catch (err: unknown) {
    jobRecord.status = "failed";
    if (err instanceof Error && err.name === "AbortError") {
      jobRecord.error = "Voice generation took too long.";
    } else {
      jobRecord.error = err instanceof Error ? err.message : String(err);
      console.error(`[${jobId}] TTS Generation Failed:`, err);
    }
    jobRecord.updated_at = new Date().toISOString();
    await writeVoiceJob(jobRecord);
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => undefined);
    }
  }

  return jobRecord;
}
