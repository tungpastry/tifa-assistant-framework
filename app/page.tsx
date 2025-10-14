"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Song {
  title: string;
  artist: string;
}

export default function Home() {
  const [vibe, setVibe] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [mood, setMood] = useState<string>("Focused");
  const [voiceUrl, setVoiceUrl] = useState<string>("");

  // ==================================================
  // Fetch Vibe (Qwen3)
  // ==================================================
  useEffect(() => {
    async function fetchVibe() {
      try {
        const res = await fetch("/api/vibe");
        const data = await res.json();
        console.log("🎯 vibe data:", data);

        const newVibe = data.vibe || "Stay calm and trade with confidence 💫";
        setVibe(newVibe);

        // Gọi API Piper để tạo voice
        const voiceRes = await fetch(
          `/api/voice?text=${encodeURIComponent(newVibe)}`
        );
        const voiceData = await voiceRes.json();
        if (voiceData.audio) {
          const audioBlob = b64toBlob(voiceData.audio, "audio/wav");
          const audioUrl = URL.createObjectURL(audioBlob);
          setVoiceUrl(audioUrl);

          // ✅ Phát giọng nói tự động
          const audio = new Audio(audioUrl);
          audio.play().catch((err) =>
            console.warn("⚠️ Auto-play blocked by browser:", err)
          );
        }
      } catch (err) {
        console.error("❌ Error fetching vibe or voice:", err);
        setVibe("Stay calm and trade with confidence 💫");
      } finally {
        setLoading(false);
      }
    }

    fetchVibe();
  }, []);

  // ==================================================
  // Fetch Music (Gemma3)
  // ==================================================
  useEffect(() => {
    async function fetchMusic() {
      try {
        const res = await fetch("/api/music");
        const data = await res.json();
        setPlaylist(data.playlist || []);
      } catch (err) {
        console.error("❌ Error fetching music:", err);
      }
    }

    fetchMusic();
  }, [mood]);

  // ==================================================
  // Helper: Base64 → Blob
  // ==================================================
  function b64toBlob(b64Data: string, contentType = "", sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  }

  // ==================================================
  // UI RENDER
  // ==================================================
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-100">
      <motion.h1
        className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        TradeVibe 🎧
      </motion.h1>

      {/* Vibe Section */}
      <div className="text-center mb-6 px-4">
        {loading ? (
          <p className="text-gray-400 animate-pulse">Loading...</p>
        ) : (
          <motion.p
            key={vibe}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-lg text-gray-200 italic leading-relaxed"
          >
            {vibe}
          </motion.p>
        )}
      </div>

      {/* Voice Player */}
      {voiceUrl && (
        <audio
          controls
          autoPlay
          className="mb-10"
          src={voiceUrl}
        >
          Your browser does not support audio playback.
        </audio>
      )}

      {/* Mood Buttons */}
      <div className="flex gap-3 mb-8">
        {["Focused", "Tired", "Anxious", "Confident", "Happy"].map((m) => (
          <button
            key={m}
            onClick={() => setMood(m)}
            className={`px-4 py-2 rounded-full border ${
              mood === m
                ? "bg-pink-500 text-white"
                : "border-gray-600 text-gray-300 hover:bg-gray-800"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Playlist Section */}
      <div className="text-center w-full max-w-md">
        <h2 className="text-xl font-semibold mb-3 text-blue-300">
          {mood} Mood Playlist 🎵
        </h2>
        {playlist.map((song) => (
          <div
            key={song.title}
            className="flex justify-between py-2 px-4 bg-gray-800 rounded-lg mb-2 text-sm"
          >
            <span>{song.title}</span>
            <span className="text-gray-400">{song.artist}</span>
          </div>
        ))}
      </div>

      <p className="text-sm mt-10 text-gray-500">
        Powered by Qwen3 🧠 + Gemma3 🎵 + Piper 🎙️
      </p>
    </main>
  );
}
