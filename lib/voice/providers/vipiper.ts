import { disabledVoiceHealth } from "./base";
import { PiperVoiceProvider, getPiperVoiceRuntimeConfig, type PiperVoiceRuntimeConfig } from "./piper";

export function getViPiperVoiceRuntimeConfig(): PiperVoiceRuntimeConfig {
  const fallback = getPiperVoiceRuntimeConfig();
  const modelPath = process.env.TIFA_VIPIPER_MODEL || fallback.modelPath;

  return {
    voiceId: "tifa-vi-default",
    modelPath,
    modelName: modelPath.split("/").pop() || modelPath,
    piperBin: process.env.TIFA_VIPIPER_BIN || fallback.piperBin,
    timeoutMs: fallback.timeoutMs,
  };
}

export class ViPiperVoiceProvider extends PiperVoiceProvider {
  name = "vipiper";
  licenseClass = "unknown";

  constructor(config = getViPiperVoiceRuntimeConfig()) {
    super(config);
  }

  async health() {
    if (process.env.TIFA_VIPIPER_ENABLED !== "1") {
      return disabledVoiceHealth(this.name, "TIFA_VIPIPER_ENABLED is not 1.");
    }

    return super.health();
  }
}

