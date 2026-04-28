import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

const PIPER_TIMEOUT = process.env.PIPER_TIMEOUT_MS || "10000";
const MAX_TEXT_LENGTH = 500;

async function safeUnlink(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') {
      console.error(`Failed to delete temp file: ${filePath}`, err);
    }
  }
}

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
    return NextResponse.json({ error: "Text cannot be empty." }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.` }, { status: 413 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), parseInt(PIPER_TIMEOUT, 10));

  try {
    const audioBuffer = await generateVoice(text, controller.signal);
    return NextResponse.json({
      voice: "Tifa (LibriTTS High)",
      model: process.env.PIPER_MODEL || "en_US-libritts-high.onnx",
      audio: audioBuffer.toString("base64"),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error("Piper process timed out or was aborted.");
      return NextResponse.json({ error: "Voice generation took too long." }, { status: 504 });
    }
    console.error("TradeVibe voice generation error:", err);
    return NextResponse.json({ error: "Failed to generate voice." }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
