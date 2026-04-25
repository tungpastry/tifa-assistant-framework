"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChatTifa from "@/components/ChatTifa";

interface PlaylistItem {
  name?: string;
  title?: string;
  url: string;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState("");
  const [vibe, setVibe] = useState("");
  const [spotify, setSpotify] = useState<PlaylistItem[]>([]);
  const [youtube, setYoutube] = useState<PlaylistItem[]>([]);
  const [audio, setAudio] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToday() {
      try {
        const res = await fetch("/api/today");
        const data = await res.json();
        console.log("🎯 Today data:", data);

        setMood(data.mood || "focused");
        setVibe(
          data.vibe ||
            "Stay calm and trade with confidence 💫"
        );
        setSpotify(data.spotify || []);
        setYoutube(data.youtube || []);
        setAudio(data.audio || null);

        // 🔊 Auto-play Piper voice
        if (data.audio) {
          const audioBlob = b64toBlob(data.audio, "audio/wav");
          const audioUrl = URL.createObjectURL(audioBlob);
          const player = new Audio(audioUrl);
          player.play().catch((err) =>
            console.warn("⚠️ Auto-play blocked:", err)
          );
        }
      } catch (err) {
        console.error("❌ Failed to fetch /api/today:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchToday();
  }, []);

  // Helper: Base64 → Blob
  function b64toBlob(b64Data: string, contentType = "audio/wav") {
    const byteCharacters = atob(b64Data);
    const byteNumbers = Array.from(byteCharacters, (c) => c.charCodeAt(0));
    return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
  }

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-100 px-4 overflow-hidden">
      <motion.img
        src="/logo.png"
        alt="TradeVibe Logo"
        className="w-32 h-32 mb-4 rounded-full shadow-lg mx-auto bg-white p-2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      />
      <motion.h1
        className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        TradeVibe 🎧
      </motion.h1>

      {loading ? (
        <p className="text-gray-400 animate-pulse text-center">
          Loading today’s vibe...
        </p>
      ) : (
        <>
          {/* Mood + Vibe */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-pink-400 mb-2">
              Mood Today:{" "}
              {mood.charAt(0).toUpperCase() + mood.slice(1)}{" "}
              {mood === "happy" ? "💖" : mood === "focused" ? "🧠" : "🎵"}
            </h2>

            <motion.p
              key={vibe}
              className="text-lg italic text-gray-200 leading-relaxed max-w-2xl mx-auto whitespace-pre-line"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {vibe}
            </motion.p>
          </div>

          {audio && (
            <audio
              controls
              autoPlay
              className="my-6 w-80"
              src={URL.createObjectURL(b64toBlob(audio, "audio/wav"))}
            >
              Your browser does not support audio playback.
            </audio>
          )}

          {/* Spotify */}
          {spotify.length > 0 && (
            <div className="w-full max-w-2xl mt-6">
              <h3 className="text-xl font-semibold text-green-400 mb-3 text-center">
                Spotify Playlist 🎵
              </h3>
              {spotify.slice(0, 1).map((s) => {
                const id = s.url.split("/playlist/")[1];
                return (
                  <iframe
                    key={id}
                    src={`https://open.spotify.com/embed/playlist/${id}`}
                    width="100%"
                    height="380"
                    allow="encrypted-media"
                    className="rounded-xl shadow-lg"
                  ></iframe>
                );
              })}
            </div>
          )}

          {/* YouTube */}
          {youtube.length > 0 && (
            <div className="w-full max-w-2xl mt-10">
              <h3 className="text-xl font-semibold text-red-400 mb-3 text-center">
                YouTube Playlist 📺
              </h3>
              {youtube.slice(0, 1).map((y) => {
                const vid = new URL(y.url).searchParams.get("v");
                return (
                  <div key={vid} className="aspect-video mb-4">
                    <iframe
                      width="100%"
                      height="315"
                      src={`https://www.youtube.com/embed/${vid}`}
                      title={y.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-xl shadow-lg"
                    ></iframe>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-sm mt-10 text-gray-500 text-center">
            Powered by Qwen3 🧠 + Gemma3 🎵 + Piper 🎙️
          </p>

          {/* 💬 Chatbot Tifa — synced mood */}
          <ChatTifa mood={mood} />
        </>
      )}
    </main>
  );
}
