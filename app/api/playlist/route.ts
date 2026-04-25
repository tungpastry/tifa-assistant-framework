import { NextResponse } from "next/server";
import {
  ensureRuntimeDirs,
  getCurrentDate,
  getDailyVibesDir,
  listFilesByMtimeDesc,
  readJsonFile,
} from "@/lib/runtime";

interface PlaylistItem {
  name?: string;
  title?: string;
  url: string;
}

interface MusicBundle {
  mood?: string;
  spotify?: PlaylistItem[];
  youtube?: PlaylistItem[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mood = (searchParams.get("mood") || "focused").toLowerCase();
    const today = getCurrentDate();

    ensureRuntimeDirs();

    const matches = listFilesByMtimeDesc(
      getDailyVibesDir(),
      (fileName) => fileName.startsWith(`music_${mood}_`) && fileName.endsWith(".json")
    );
    const selected =
      matches.find((file) => file.name.includes(today)) || matches[0] || null;

    if (!selected) {
      return NextResponse.json(
        { error: `Playlist for ${mood} not found.` },
        { status: 404 }
      );
    }

    const jsonData = readJsonFile<MusicBundle>(selected.fullPath);

    return NextResponse.json({
      mood: jsonData.mood || mood,
      spotify: jsonData.spotify || [],
      youtube: jsonData.youtube || [],
    });
  } catch (err) {
    console.error("TradeVibe /api/playlist error:", err);
    return NextResponse.json(
      { error: "Failed to load playlist data." },
      { status: 500 }
    );
  }
}
