import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  encodeAudioFile,
  ensureRuntimeDirs,
  extractDateFromName,
  getCurrentDate,
  getDailyVibesDir,
  listFilesByMtimeDesc,
  readJsonFile,
  readLatestManifest,
  resolveFromRepoRoot,
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
  created_at?: string;
}

interface VibeBundle {
  mood?: string;
  text?: string;
}

function pickMusicFile(date: string) {
  const dailyVibesDir = getDailyVibesDir();
  const musicFiles = listFilesByMtimeDesc(
    dailyVibesDir,
    (fileName) => fileName.startsWith("music_") && fileName.endsWith(".json")
  );

  const todayMatch = musicFiles.find((file) => file.name.includes(date));
  return todayMatch?.fullPath || musicFiles[0]?.fullPath || null;
}

function resolveSiblingArtifact(
  musicPath: string,
  prefix: "vibe",
  mood: string,
  extension: "json" | "wav"
) {
  const date = extractDateFromName(path.basename(musicPath));
  if (!date) {
    return null;
  }

  return path.join(path.dirname(musicPath), `${prefix}_${mood}_${date}.${extension}`);
}

export async function GET() {
  try {
    ensureRuntimeDirs();

    const today = getCurrentDate();
    const latestManifest = readLatestManifest();
    const manifestMusicPath = latestManifest?.musicPath
      ? resolveFromRepoRoot(latestManifest.musicPath)
      : null;

    const musicPath =
      manifestMusicPath && fs.existsSync(manifestMusicPath)
        ? manifestMusicPath
        : pickMusicFile(today);

    if (!musicPath) {
      throw new Error("No generated playlist bundle found in runtime/daily_vibes.");
    }

    const musicJson = readJsonFile<MusicBundle>(musicPath);
    const mood = musicJson.mood || latestManifest?.mood || "focused";
    const vibePath =
      latestManifest?.vibePath && fs.existsSync(resolveFromRepoRoot(latestManifest.vibePath))
        ? resolveFromRepoRoot(latestManifest.vibePath)
        : resolveSiblingArtifact(musicPath, "vibe", mood, "json");
    const audioPath =
      latestManifest?.audioPath && fs.existsSync(resolveFromRepoRoot(latestManifest.audioPath))
        ? resolveFromRepoRoot(latestManifest.audioPath)
        : resolveSiblingArtifact(musicPath, "vibe", mood, "wav");
    let vibeText = "Stay calm and trade with confidence 💫";

    if (vibePath && fs.existsSync(vibePath)) {
      const vibeJson = readJsonFile<VibeBundle>(vibePath);
      vibeText = vibeJson.text || vibeText;
    }

    const generatedDate = extractDateFromName(path.basename(musicPath)) || today;
    const voiceBase64 = encodeAudioFile(audioPath);

    return NextResponse.json({
      date: generatedDate,
      mood,
      vibe: vibeText,
      spotify: musicJson.spotify || [],
      youtube: musicJson.youtube || [],
      audio: voiceBase64,
      created_at: musicJson.created_at || latestManifest?.updatedAt || new Date().toISOString(),
    });
  } catch (err) {
    console.error("TradeVibe /api/today error:", err);
    return NextResponse.json(
      { error: "Failed to load daily vibe & playlist" },
      { status: 500 }
    );
  }
}
