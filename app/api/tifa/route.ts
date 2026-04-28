import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const TIFA_TIMEOUT = process.env.TIFA_TIMEOUT_MS || "20000";
const MAX_MESSAGE_LENGTH = 2000;
const PROMPT_PATH = process.env.TIFA_PROMPT_PATH || "prompts/TIFA_RUNTIME.md";
const DEFAULT_PROMPT = "You are Tifa — a warm, encouraging AI trading companion. Respond naturally and motivate the user like a supportive partner.";

async function getTifaPrompt() {
  try {
    const fullPath = path.resolve(process.cwd(), PROMPT_PATH);
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    console.warn(`Could not read Tifa prompt from ${PROMPT_PATH}, using default.`);
    return DEFAULT_PROMPT;
  }
}

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const message = (body.message || "").toString().trim();

    if (!message) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.` }, { status: 413 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), parseInt(TIFA_TIMEOUT, 10));

    try {
      const tifaPrompt = await getTifaPrompt();
      const finalPrompt = `${tifaPrompt}\nUser message: ${message}`;

      const res = await fetch(process.env.TIFA_API_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.TIFA_MODEL,
          prompt: finalPrompt,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Ollama API error: ${res.status} ${res.statusText}`, errorText);
        return NextResponse.json({ error: "The AI service failed to respond." }, { status: 502 });
      }

      const json = await res.json();
      const reply = json.response || "I'm here, but I couldn't think of a reply. Let’s talk markets 💬";

      return NextResponse.json({ reply, model: process.env.TIFA_MODEL });

    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        console.error("Tifa API request timed out.");
        return NextResponse.json({ error: "The AI service took too long to respond." }, { status: 504 });
      }
      // For other fetch-related errors
      console.error("❌ Tifa API fetch error:", err);
      return NextResponse.json({ error: "An unexpected error occurred while contacting the AI service." }, { status: 500 });
    }
  } catch (err: unknown) {
    // For errors during request parsing or other top-level issues
    console.error("❌ Tifa API critical error:", err);
    return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
  }
}
