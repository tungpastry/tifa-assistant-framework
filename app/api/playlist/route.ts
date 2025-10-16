import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ========================================================
// GET /api/playlist?mood=focused
// ========================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mood = (searchParams.get("mood") || "focused").toLowerCase();

    // Tự động tìm file JSON theo ngày
    const today = new Date().toISOString().split("T")[0];
    const filename = `music_${mood}_${today}.json`;
    const filePath = path.join(
      process.cwd(),
      "insight_engine",
      "output",
      "daily_vibes",
      filename
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `Playlist for ${mood} not found.` },
        { status: 404 }
      );
    }

    const data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);

    return NextResponse.json({
      mood: jsonData.mood || mood,
      spotify: jsonData.spotify || [],
      youtube: jsonData.youtube || [],
    });
  } catch (err) {
    console.error("❌ [API] /playlist error:", err);
    return NextResponse.json(
      { error: "Failed to load playlist data." },
      { status: 500 }
    );
  }
}
