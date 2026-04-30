"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { useTifaChat, useTifaVoice } from "@/lib/tifa-widget";

export default function TifaWidget({ mood }: { mood: string }) {
  const [minimized, setMinimized] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const {
    voiceEnabled,
    setVoiceEnabled,
    playGreetingVoice,
    playReplyVoice,
  } = useTifaVoice(true);
  const {
    messages,
    input,
    setInput,
    typing,
    error,
    sending,
    sendMessage,
  } = useTifaChat({
    mood,
    onGreeting: playGreetingVoice,
    onAssistantReply: playReplyVoice,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const moodLower = mood.toLowerCase();
  const avatarSrc = `/tifa_${moodLower}.png`;
  const bgMood =
    moodLower === "happy"
      ? "bg-yellow-200/10"
      : moodLower === "confident"
      ? "bg-pink-200/10"
      : moodLower === "focused"
      ? "bg-blue-200/10"
      : moodLower === "anxious"
      ? "bg-purple-200/10"
      : "bg-gray-200/10";

  return (
    <div
      className={`fixed bottom-5 right-5 w-80 border border-gray-700 rounded-2xl shadow-2xl ${bgMood} backdrop-blur-md text-gray-100 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gradient-to-r from-pink-500/30 to-purple-500/30 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <Image
            src={avatarSrc}
            alt="Tifa Avatar"
            width={40}
            height={40}
            className="rounded-full border border-pink-400 shadow-md"
          />
          <div>
            <p className="font-semibold text-pink-300">Tifa</p>
            <p className="text-xs text-gray-300">Mood: {mood}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="text-gray-300 hover:text-white transition"
            aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={() => setMinimized(!minimized)}
            className="text-gray-300 hover:text-white transition"
            aria-label="Minimize chat"
          >
            {minimized ? <MessageCircle size={18} /> : <Minus size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col"
          >
            <div className="h-80 overflow-y-auto p-3 space-y-3 text-sm">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`p-2 rounded-lg max-w-[90%] ${
                      msg.sender === "user"
                        ? "ml-auto bg-pink-600/60"
                        : "mr-auto bg-gray-800/70"
                    }`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {msg.text}
                  </motion.div>
                ))}
              </AnimatePresence>

              {typing && (
                <motion.div className="flex gap-1 text-gray-400">
                  <span className="animate-pulse" style={{ animationDelay: "0s" }}>•</span>
                  <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>•</span>
                  <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>•</span>
                </motion.div>
              )}
              {error && (
                <div className="p-2 text-xs text-red-300 bg-red-500/20 rounded-lg">
                  {error}
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input box */}
            <div className="flex gap-2 p-3 border-t border-gray-700 bg-gray-900/40 rounded-b-2xl">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={sending ? "Tifa is replying..." : "Ask Tifa something..."}
                disabled={sending}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-800 text-gray-100 text-sm border border-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-400 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="px-3 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-white text-sm font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
