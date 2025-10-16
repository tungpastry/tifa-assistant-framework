"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface ChatTifaProps {
  mood?: string;
}

type ChatMessage = { sender: "tifa" | "user"; text: string };

export default function ChatTifa({ mood = "focused" }: ChatTifaProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 🌈 Avatar gradient theo mood
  const moodColor =
    mood === "happy"
      ? "from-pink-400 to-yellow-300"
      : mood === "focused"
      ? "from-blue-400 to-purple-400"
      : mood === "confident"
      ? "from-red-400 to-orange-400"
      : mood === "tired"
      ? "from-gray-400 to-gray-600"
      : "from-cyan-400 to-teal-400";

  // 🧠 Greeting message + auto voice
  useEffect(() => {
    const greet = async () => {
      const greeting = "Hey Trader, how do you feeling today?";
      setTyping(true);
      await typeEffect(greeting);
      setTyping(false);
      setMessages([{ sender: "tifa", text: greeting }]);

      // 🔊 Play greeting voice (Piper)
      try {
        const res = await fetch(
          `/api/voice?text=${encodeURIComponent(greeting)}`
        );
        const data = await res.json();
        if (data.audio) {
          const audioBlob = b64toBlob(data.audio, "audio/wav");
          const audioUrl = URL.createObjectURL(audioBlob);
          const player = new Audio(audioUrl);
          player.play().catch((err) => console.warn("⚠️ Autoplay blocked:", err));
        }
      } catch (err) {
        console.warn("⚠️ Voice unavailable:", err);
      }
    };
    greet();
  }, [mood]);

  // ✨ Hiệu ứng gõ chữ cho Tifa
  async function typeEffect(text: string) {
    let typed = "";
    for (let i = 0; i < text.length; i++) {
      typed += text[i];
      setMessages([{ sender: "tifa", text: typed }]);
      await new Promise((r) => setTimeout(r, 35));
    }
  }

  // 🎧 Base64 → Blob helper
  function b64toBlob(b64Data: string, contentType = "audio/wav") {
    const byteCharacters = atob(b64Data);
    const byteNumbers = Array.from(byteCharacters, (c) => c.charCodeAt(0));
    return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
  }

  // 🔽 Auto scroll khi có tin nhắn mới
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 📤 Gửi tin nhắn
  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessages: ChatMessage[] = [
      ...messages,
      { sender: "user", text: input } as ChatMessage,
    ];
    setMessages(newMessages);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch("/api/tifa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      const reply = data.reply || "Tifa couldn’t reach the server 💭";

      // 🧠 Cập nhật tin nhắn mới
      setMessages([...newMessages, { sender: "tifa", text: reply } as ChatMessage]);

      // 🔊 Voice Tifa đọc reply
      try {
        const voiceRes = await fetch(
          `/api/voice?text=${encodeURIComponent(reply)}`
        );
        const voiceData = await voiceRes.json();
        if (voiceData.audio) {
          const audioBlob = b64toBlob(voiceData.audio, "audio/wav");
          const audioUrl = URL.createObjectURL(audioBlob);
          const player = new Audio(audioUrl);
          player.play().catch(() => {});
        }
      } catch (e) {
        console.warn("Voice for reply not available");
      }
    } catch {
      setMessages([
        ...newMessages,
        { sender: "tifa", text: "Hmm… I’m having trouble connecting 💭" } as ChatMessage,
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-80 rounded-2xl bg-gray-900/90 border border-gray-700 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-3 p-3 bg-gradient-to-r ${moodColor}`}>
        <Image
          src={`/tifa_${mood}.png`}
          alt="Tifa Avatar"
          width={42}
          height={42}
          className="rounded-full border border-white/40"
        />
        <div>
          <h3 className="text-white font-semibold">Tifa — Trading Assistant</h3>
          <p className="text-xs text-gray-200">Mood Today: {mood}</p>
        </div>
      </div>

      {/* Chat body */}
      <div className="h-72 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-2 rounded-xl max-w-[85%] text-sm ${
              msg.sender === "user"
                ? "ml-auto bg-pink-600 text-white"
                : "mr-auto bg-gray-800 text-gray-100"
            }`}
          >
            {msg.text}
          </motion.div>
        ))}
        {typing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-gray-400 text-xs italic"
          >
            Tifa is typing…
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center border-t border-gray-700">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Tifa something..."
          className="flex-1 bg-transparent text-gray-200 text-sm p-3 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="bg-pink-500 hover:bg-pink-600 text-white text-sm px-4 py-2 m-2 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}
