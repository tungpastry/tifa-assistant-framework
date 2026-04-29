// Force the use of Node.js runtime
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { jsonError } from "@/lib/api";
import { checkRateLimit, getClientIp, parsePositiveInt } from "@/lib/rate-limit";
import {
  MAX_TTS_TEXT_LENGTH,
  CreateVoiceJobInput,
  createTtsCacheKey,
  readAudioCacheMeta,
  generateVoiceToCache,
  getVoiceIdentity,
  writeVoiceJob,
  VoiceJobRecord,
} from "@/lib/tts-cache";

const RATE_LIMIT_WINDOW_MS = parsePositiveInt(
  process.env.VOICE_RATE_LIMIT_WINDOW_MS,
  60000
);
const RATE_LIMIT_MAX = parsePositiveInt(process.env.VOICE_RATE_LIMIT_MAX, 10);

export async function POST(req: Request) {
  try {
    let body: CreateVoiceJobInput;
    try {
      body = await req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON in request body.", 400);
    }

    const text = (body.text || "").trim();

    if (!text) {
      return jsonError("VALIDATION_ERROR", "Text cannot be empty.", 400);
    }

    if (text.length > MAX_TTS_TEXT_LENGTH) {
      return jsonError(
        "PAYLOAD_TOO_LARGE",
        `Text exceeds maximum length of ${MAX_TTS_TEXT_LENGTH} characters.`,
        413
      );
    }

    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      key: `voice-job:${clientIp}`,
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimitResult.allowed) {
      return jsonError(
        "RATE_LIMITED",
        "Too many voice requests. Please slow down.",
        429,
        {
          retryable: true,
          publicDetails: { retry_after_seconds: rateLimitResult.retryAfterSeconds },
        }
      );
    }

    const cacheKey = createTtsCacheKey({ ...body, text });
    const cachedMeta = await readAudioCacheMeta(cacheKey);

    const identity = getVoiceIdentity();

    if (cachedMeta) {
      // Cache hit
      // In a real system, we'd update the hit_count here asynchronously
      const jobId = `tts_${randomUUID()}`;
      const now = new Date().toISOString();
      const voice = body.voice || identity.voice;
      const model = identity.modelName;
      const audioUrl = `/api/voice/jobs/${jobId}/audio`;

      const jobRecord: VoiceJobRecord = {
        job_id: jobId,
        status: "ready",
        cache_key: cacheKey,
        audio_url: audioUrl,
        error: null,
        voice,
        model,
        created_at: now,
        updated_at: now,
      };

      await writeVoiceJob(jobRecord);

      return NextResponse.json({
        status: "ready",
        cache_hit: true,
        job_id: jobId,
        audio_url: audioUrl,
        voice,
        model,
      });
    }

    // Cache miss - generate immediately for this slice
    const jobId = `tts_${randomUUID()}`;
    
    try {
      const jobRecord = await generateVoiceToCache({ ...body, text }, jobId);
      return NextResponse.json({
        status: jobRecord.status,
        cache_hit: false,
        job_id: jobRecord.job_id,
        audio_url: jobRecord.audio_url,
        voice: jobRecord.voice,
        model: jobRecord.model,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return jsonError("TTS_TIMEOUT", "Voice generation took too long.", 504, { retryable: true });
      }
      return jsonError("TTS_GENERATION_FAILED", "Failed to generate voice.", 500, {
        details: err instanceof Error ? err.message : String(err),
      });
    }

  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
