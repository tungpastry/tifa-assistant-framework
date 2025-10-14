// ==========================================================
// File: pages/api/voice.ts
// Project: TradeVibe.org
// Description: Generate Tifa Voice via Piper TTS local (v0.0.4+)
// ==========================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { execSync } from "child_process";
import fs from "fs";
import { randomUUID } from "crypto";

interface VoiceResponse {
  voice: string;
  model: string;
  audio: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VoiceResponse>
) {
  try {
    const text =
      req.query.text?.toString() ||
      "Hello trader, stay calm and follow your plan 💫";

    const modelPath = "/home/nexus/piper/voices/en_US-libritts-high.onnx";
    const outputFile = `/tmp/${randomUUID()}.wav`;
    const piperCmd = `/home/nexus/piper-env/bin/piper --model ${modelPath} --output_file ${outputFile}`;

    console.log(`🎙 Running Piper: echo "${text}" | ${piperCmd}`);

    execSync(`echo "${text.replace(/"/g, '\\"')}" | ${piperCmd}`, {
      stdio: "ignore",
    });

    const audioData = fs.readFileSync(outputFile);
    const base64Audio = audioData.toString("base64");
    fs.unlinkSync(outputFile);

    res.status(200).json({
      voice: "Tifa (LibriTTS High)",
      model: modelPath,
      audio: base64Audio,
    });
  } catch (error) {
    console.error("❌ Error generating Tifa voice:", error);
    res.status(500).json({
      voice: "Tifa (LibriTTS High)",
      model: "piper",
      audio: "",
      error: "Failed to generate voice",
    });
  }
}
