export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { createDefaultVoiceProviderRegistry } from "@/lib/voice/provider-registry";

export async function GET() {
  try {
    const registry = createDefaultVoiceProviderRegistry();
    const { health, voices } = await registry.getAvailableVoices();

    return NextResponse.json({
      providers: health,
      voices: voices.filter((voice) => voice.enabled),
    });
  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "Unable to read voice providers.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
