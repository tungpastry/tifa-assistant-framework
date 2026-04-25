import type { NextApiRequest, NextApiResponse } from "next";
import { spawnSync } from "child_process";
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
  const outputFile = `/tmp/${randomUUID()}.wav`;

  try {
    const text =
      req.query.text?.toString() ||
      "Hello trader, stay calm and follow your plan 💫";
    const modelPath =
      process.env.PIPER_MODEL || "/home/nexus/piper/voices/en_US-libritts-high.onnx";
    const piperBin = process.env.PIPER_BIN || "/home/nexus/piper-env/bin/piper";

    const result = spawnSync(
      piperBin,
      ["--model", modelPath, "--output_file", outputFile],
      {
        input: text,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "Piper exited with a non-zero status.");
    }

    if (!fs.existsSync(outputFile)) {
      throw new Error("Piper did not produce an output file.");
    }

    const audioData = fs.readFileSync(outputFile);
    res.status(200).json({
      voice: "Tifa (LibriTTS High)",
      model: modelPath,
      audio: audioData.toString("base64"),
    });
  } catch (error) {
    console.error("TradeVibe voice generation error:", error);
    res.status(500).json({
      voice: "Tifa (LibriTTS High)",
      model: "piper",
      audio: "",
      error: "Failed to generate voice",
    });
  } finally {
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
  }
}
