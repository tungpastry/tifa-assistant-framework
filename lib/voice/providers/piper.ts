import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { parseTimeoutMs } from "@/lib/api";
import type { VoiceInfo, VoiceProvider, VoiceProviderHealth, VoiceSynthesisInput } from "../types";
import { assertVoiceInput, normalizeVoiceText } from "./base";

export interface PiperVoiceRuntimeConfig {
  voiceId: string;
  modelPath: string;
  modelName: string;
  piperBin: string;
  timeoutMs: number;
}

export function getPiperVoiceRuntimeConfig(): PiperVoiceRuntimeConfig {
  const modelPath = process.env.PIPER_MODEL || "/home/nexus/piper/voices/en_US-libritts-high.onnx";

  return {
    voiceId: "tifa-default",
    modelPath,
    modelName: path.basename(modelPath),
    piperBin: process.env.PIPER_BIN || "/home/nexus/piper-env/bin/piper",
    timeoutMs: parseTimeoutMs(process.env.PIPER_TIMEOUT_MS, 10000),
  };
}

export class PiperVoiceProvider implements VoiceProvider {
  name = "piper";
  supportsStreaming = false;
  supportsVoiceCloning = false;
  licenseClass = "unknown";
  private config: PiperVoiceRuntimeConfig;

  constructor(config: PiperVoiceRuntimeConfig = getPiperVoiceRuntimeConfig()) {
    this.config = config;
  }

  async synthesizeToFile(input: VoiceSynthesisInput) {
    assertVoiceInput(input);
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      await new Promise<void>((resolve, reject) => {
        const piperProcess = spawn(
          this.config.piperBin,
          ["--model", input.modelId || this.config.modelPath, "--output_file", input.outputPath],
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
        piperProcess.stdin.write(normalizeVoiceText(input.text));
        piperProcess.stdin.end();
      });
    } finally {
      clearTimeout(timeoutId);
    }

    return {
      outputPath: input.outputPath,
      provider: this.name,
      voiceId: input.voiceId || this.config.voiceId,
      modelId: input.modelId || this.config.modelPath,
      format: input.format || "wav",
      latencyMs: Date.now() - startedAt,
    };
  }

  async health(): Promise<VoiceProviderHealth> {
    const details: Record<string, unknown> = {
      bin: this.config.piperBin,
      model: this.config.modelPath,
    };
    let status: VoiceProviderHealth["status"] = "ok";

    try {
      await fs.access(this.config.piperBin, fs.constants.X_OK);
    } catch {
      status = "down";
      details.bin_error = `File not found or not executable: ${this.config.piperBin}`;
    }

    try {
      await fs.access(this.config.modelPath, fs.constants.R_OK);
    } catch {
      status = status === "down" ? "down" : "degraded";
      details.model_error = `File not found or not readable: ${this.config.modelPath}`;
    }

    return {
      provider: this.name,
      status,
      details,
    };
  }

  async getVoices(): Promise<VoiceInfo[]> {
    return [
      {
        id: this.config.voiceId,
        name: "Tifa default Piper voice",
        locale: "en-US",
        modelId: this.config.modelPath,
        licenseClass: this.licenseClass,
      },
    ];
  }
}

