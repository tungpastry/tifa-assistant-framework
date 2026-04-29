import fs from "fs/promises";
import { disabledVoiceHealth, assertVoiceInput } from "./base";
import type { VoiceInfo, VoiceProvider, VoiceProviderHealth, VoiceSynthesisInput } from "../types";

export interface VieNeuVoiceProviderOptions {
  enabled?: boolean;
  baseUrl?: string;
  modelId?: string;
  licenseClass?: string;
  timeoutMs?: number;
}

export class VieNeuVoiceProvider implements VoiceProvider {
  name = "vieneu";
  supportsStreaming = false;
  supportsVoiceCloning = false;
  licenseClass: string;
  private enabled: boolean;
  private baseUrl: string;
  private modelId: string;
  private timeoutMs: number;

  constructor(options: VieNeuVoiceProviderOptions = {}) {
    this.enabled = options.enabled ?? process.env.TIFA_VIENEU_ENABLED === "1";
    this.baseUrl = options.baseUrl || process.env.TIFA_VIENEU_BASE_URL || "http://127.0.0.1:8089";
    this.modelId = options.modelId || process.env.TIFA_VIENEU_MODEL || "pnnbao-ump/VieNeu-TTS-q4-gguf";
    this.licenseClass = options.licenseClass || process.env.TIFA_VIENEU_LICENSE_CLASS || "apache-2.0";
    this.timeoutMs = options.timeoutMs ?? 30000;
  }

  async synthesizeToFile(input: VoiceSynthesisInput) {
    assertVoiceInput(input);

    if (!this.enabled) {
      throw new Error("VieNeu voice provider is disabled.");
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text,
          voice_id: input.voiceId || "vieneu-default",
          model: input.modelId || this.modelId,
          format: input.format || "wav",
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`VieNeu facade returned ${res.status}`);
      }

      const audio = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(input.outputPath, audio);

      return {
        outputPath: input.outputPath,
        provider: this.name,
        voiceId: input.voiceId || "vieneu-default",
        modelId: input.modelId || this.modelId,
        format: input.format || "wav",
        latencyMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async health(): Promise<VoiceProviderHealth> {
    if (!this.enabled) {
      return disabledVoiceHealth(this.name, "TIFA_VIENEU_ENABLED is not 1.");
    }

    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return {
        provider: this.name,
        status: res.ok ? "ok" : "down",
        details: {
          baseUrl: this.baseUrl,
          modelId: this.modelId,
          licenseClass: this.licenseClass,
          status: res.status,
        },
      };
    } catch (error) {
      return {
        provider: this.name,
        status: "down",
        details: { baseUrl: this.baseUrl, error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  async getVoices(): Promise<VoiceInfo[]> {
    return [
      {
        id: "vieneu-default",
        name: "VieNeu facade default voice",
        locale: "vi-VN",
        modelId: this.modelId,
        licenseClass: this.licenseClass,
      },
    ];
  }
}

