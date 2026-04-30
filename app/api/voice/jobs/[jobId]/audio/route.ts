export const runtime = "nodejs";

import fs from "fs/promises";
import { jsonError } from "@/lib/api";
import { isSafeVoiceJobId, readVoiceJob, getAudioCachePath } from "@/lib/tts-cache";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { jobId } = resolvedParams;

    if (!jobId || !isSafeVoiceJobId(jobId)) {
      return jsonError("VALIDATION_ERROR", "Voice job not found.", 404);
    }

    const job = await readVoiceJob(jobId);

    if (!job) {
      return jsonError("VALIDATION_ERROR", "Voice job not found.", 404);
    }

    if (job.status !== "ready") {
      return jsonError("VALIDATION_ERROR", "Voice job is not ready.", 409);
    }

    const audioPath = getAudioCachePath(job.cache_key);
    
    try {
      const audioBuffer = await fs.readFile(audioPath);
      const responseBody = new Uint8Array(audioBuffer);
      return new Response(responseBody, {
        headers: {
          "Content-Type": "audio/wav",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      return jsonError("INTERNAL_ERROR", "Audio file not found in cache.", 404);
    }

  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
