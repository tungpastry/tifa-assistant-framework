// ==========================================================
// File: app/api/today/route.ts
// Description: Unified endpoint combining vibe + mood + playlist + voice
// ==========================================================

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 🗓 Lấy ngày hiện tại
    const today = new Date().toISOString().split("T")[0];
    const baseDir = path.join(
      process.cwd(),
      "insight_engine",
      "output",
      "daily_vibes"
    );

    if (!fs.existsSync(baseDir)) {
      throw new Error(`❌ Directory not found: ${baseDir}`);
    }

    // 🔍 Tìm file music_<mood>_<date>.json hôm nay
    const files = fs
      .readdirSync(baseDir)
      .filter((f) => f.startsWith("music_") && f.endsWith(".json"));
    const todayFile =
      files.find((f) => f.includes(today)) || files.sort().reverse()[0];

    const musicPath = path.join(baseDir, todayFile);
    const musicJson = JSON.parse(fs.readFileSync(musicPath, "utf-8"));
    const mood = musicJson.mood || "focused";

    // ✅ Đọc vibe file tương ứng: vibe_<mood>_<date>.json
    const vibePath = path.join(baseDir, `vibe_${mood}_${today}.json`);
    let vibeText = "Stay calm and trade with confidence 💫";

    if (fs.existsSync(vibePath)) {
      const vibeJson = JSON.parse(fs.readFileSync(vibePath, "utf-8"));
      vibeText = vibeJson.text || vibeText;
    } else {
      console.warn(`⚠️ Vibe file not found: ${vibePath}`);
    }

    // 🔊 Gọi Piper để tạo voice base64 (optional)
    let voiceBase64: string | null = null;
    try {
      const voiceRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/voice?text=${encodeURIComponent(
          vibeText
        )}`
      );
      if (voiceRes.ok) {
        const voiceJson = await voiceRes.json();
        voiceBase64 = voiceJson.audio || null;
      }
    } catch {
      console.warn("⚠️ Piper API unavailable, skip voice synthesis.");
    }

    // ✅ Trả về unified JSON
    return NextResponse.json({
      date: today,
      mood,
      vibe: vibeText,
      spotify: musicJson.spotify || [],
      youtube: musicJson.youtube || [],
      audio: voiceBase64,
      created_at: musicJson.created_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Unified API error:", err);
    return NextResponse.json(
      { error: "Failed to load daily vibe & playlist" },
      { status: 500 }
    );
  }
}
