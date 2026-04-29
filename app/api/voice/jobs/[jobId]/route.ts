export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { readVoiceJob } from "@/lib/tts-cache";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { jobId } = resolvedParams;

    if (!jobId) {
      return jsonError("VALIDATION_ERROR", "Job ID is required.", 400);
    }

    const job = await readVoiceJob(jobId);

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
  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
