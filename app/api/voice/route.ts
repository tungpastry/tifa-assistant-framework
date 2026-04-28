import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { jsonError, parseTimeoutMs, safeUnlink } from "@/lib/api";

const PIPER_TIMEOUT_MS = parseTimeoutMs(process.env.PIPER_TIMEOUT_MS, 10000);
const MAX_TEXT_LENGTH = 500;

async function generateVoice(text: string, signal: AbortSignal): Promise<Buffer> {
  const outputFile = path.join("/tmp", `${randomUUID()}.wav`);
  const modelPath = process.env.PIPER_MODEL || "/home/nexus/piper/voices/en_US-libritts-high.onnx";
  const piperBin = process.env.PIPER_BIN || "/home/nexus/piper-env/bin/piper";

  try {
    await new Promise<void>((resolve, reject) => {
      const piperProcess = spawn(
        piperBin,
        ["--model", modelPath, "--output_file", outputFile],
        { signal }
      );

      let stderr = '';
      piperProcess.stderr.on('data', (data) => (stderr += data));

      piperProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Piper exited with code ${code}: ${stderr}`));
        }
        resolve();
      });

      piperProcess.on('error', reject);

      piperProcess.stdin.write(text);
      piperProcess.stdin.end();
    });

    return await fs.readFile(outputFile);
  } finally {
    await safeUnlink(outputFile);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") || "").trim();

  if (!text) {
    return jsonError("VALIDATION_ERROR", "Text cannot be empty.", 400);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return jsonError(
      "PAYLOAD_TOO_LARGE",
      `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`,
      413
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PIPER_TIMEOUT_MS);

  try {
    const audioBuffer = await generateVoice(text, controller.signal);
    return NextResponse.json({
      voice: "Tifa (LibriTTS High)",
      model: process.env.PIPER_MODEL || "en_US-libritts-high.onnx",
      audio: audioBuffer.toString("base64"),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return jsonError("TTS_TIMEOUT", "Voice generation took too long.", 504, { retryable: true });
    }
    return jsonError("TTS_GENERATION_FAILED", "Failed to generate voice.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
