"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, MessageCircle } from "lucide-react";

interface Message {
  sender: "tifa" | "user";
  text: string;
}

export default function ChatTifa({ mood }: { mood: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Greeting + voice
  useEffect(() => {
    const greetText = "Hey trader, how are you feeling today?";
    setMessages([{ sender: "tifa", text: greetText }]);

    async function playGreeting() {
      try {
        const res = await fetch(
          `/api/voice?text=${encodeURIComponent(greetText)}`
        );
        const data = await res.json();
        if (data.audio) {
          const blob = b64toBlob(data.audio, "audio/wav");
          const url = URL.createObjectURL(blob);
          const player = new Audio(url);
          player.play().catch(() => {});
        }
      } catch (err) {
        console.error("🎧 Greeting voice error:", err);
      }
    }
    playGreeting();
  }, []);

  async function sendMessage() {
    if (!input.trim()) return;
    const newMessages: Message[] = [...messages, { sender: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch("/api/tifa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, mood: mood.toLowerCase() }),
      });
      const data = await res.json();
      const reply = data.reply || "Hmm... I’m thinking 🧠";

      // Typing effect
      for (let i = 0; i < reply.length; i++) {
        setMessages([
          ...newMessages,
          { sender: "tifa", text: reply.slice(0, i + 1) },
        ]);
        await new Promise((r) => setTimeout(r, 15));
      }

      // Auto voice
      try {
        const vRes = await fetch(
          `/api/voice?text=${encodeURIComponent(reply)}`
        );
        const vData = await vRes.json();
        if (vData.audio) {
          const blob = b64toBlob(vData.audio, "audio/wav");
          const url = URL.createObjectURL(blob);
          const player = new Audio(url);
          player.play().catch(() => {});
        }
      } catch (err) {
        console.warn("🎙️ Voice fetch error:", err);
      }
    } catch (err) {
      console.error("❌ Chat error:", err);
    } finally {
      setTyping(false);
    }
  }

  function b64toBlob(b64: string, type = "audio/wav") {
    const bin = atob(b64);
    const arr = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new Blob([arr], { type });
  }

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
      className={`fixed bottom-5 right-5 w-80 border border-gray-700 rounded-2xl shadow-2xl ${bgMood} backdrop-blur-md text-gray-100`}
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
            <p className="font-semibold text-pink-300">Tifa — Trading Assistant</p>
            <p className="text-xs text-gray-300">Mood Today: {mood}</p>
          </div>
        </div>

        {/* Minimize button */}
        <button
          onClick={() => setMinimized(!minimized)}
          className="text-gray-300 hover:text-white transition"
          aria-label="Minimize chat"
        >
          {minimized ? <MessageCircle size={18} /> : <Minus size={18} />}
        </button>
      </div>

      {/* Chat body with animation */}
      <AnimatePresence initial={false}>
        {!minimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="h-80 overflow-y-auto p-3 space-y-2 text-sm">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
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
                <motion.div
                  className="flex gap-1 mt-2 text-gray-400 text-xs"
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </motion.div>
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
                placeholder="Ask Tifa something..."
                className="flex-1 px-3 py-2 rounded-lg bg-gray-800 text-gray-100 text-sm border border-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
              <button
                onClick={sendMessage}
                className="px-3 py-2 bg-pink-500 hover:bg-pink-600 rounded-lg text-white text-sm font-semibold"
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
