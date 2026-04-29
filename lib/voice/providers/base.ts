import type { VoiceProviderHealth, VoiceSynthesisInput } from "../types";

export function normalizeVoiceText(text: string) {
  return text.trim();
}

export function assertVoiceInput(input: VoiceSynthesisInput) {
  if (!normalizeVoiceText(input.text)) {
    throw new Error("Voice synthesis text cannot be empty.");
  }

  if (!input.outputPath.trim()) {
    throw new Error("Voice synthesis outputPath is required.");
  }
}

export function disabledVoiceHealth(provider: string, reason: string): VoiceProviderHealth {
  return {
    provider,
    status: "disabled",
    details: { reason },
  };
}

