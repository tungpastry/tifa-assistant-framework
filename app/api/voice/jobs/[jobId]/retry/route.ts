export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { isSafeVoiceJobId, retryFailedVoiceJob } from "@/lib/tts-cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId || !isSafeVoiceJobId(jobId)) {
      return jsonError("VALIDATION_ERROR", "A valid voice job ID is required.", 400);
    }

    try {
      const job = await retryFailedVoiceJob(jobId);

      if (!job) {
        return jsonError("VALIDATION_ERROR", "Voice job not found.", 404);
      }

      return NextResponse.json({
        job_id: job.job_id,
        status: job.status,
        cache_key: job.cache_key,
        audio_url: job.audio_url,
        error: job.error,
        voice: job.voice,
        model: job.model,
        created_at: job.created_at,
        updated_at: job.updated_at,
      });
    } catch (error) {
      return jsonError(
        "VALIDATION_ERROR",
        error instanceof Error ? error.message : "Voice job cannot be retried.",
        409
      );
    }
  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
