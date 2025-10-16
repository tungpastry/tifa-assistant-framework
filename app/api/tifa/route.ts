// ==========================================================
// File: app/api/tifa/route.ts
// Description: Proxy request từ FE → Gemma3:1B (Tifa AI)
// ==========================================================
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const res = await fetch(process.env.TIFA_API_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.TIFA_MODEL,
        prompt: `You are Tifa — a warm, encouraging AI trading companion.
Respond naturally and motivate the user like a supportive partner.
User message: ${message}`,
        stream: false
      }),
    });

    const json = await res.json();
    const reply = json.response || "Hey, I’m here! Let’s talk markets 💬";

    return NextResponse.json({ reply, model: process.env.TIFA_MODEL });
  } catch (err) {
    console.error("❌ Tifa API error:", err);
    return NextResponse.json({ error: "Tifa AI is unavailable" }, { status: 500 });
  }
}
