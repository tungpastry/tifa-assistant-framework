"use client";

import { useCallback, useRef, useState } from "react";
import { playTifaVoice } from "./client";

export interface TifaVoicePlaybackResult {
  voiceJobId: string | null;
}

export function useTifaVoice(defaultEnabled = true) {
  const [voiceEnabled, setVoiceEnabled] = useState(defaultEnabled);
  const greetingPlayedRef = useRef(false);

  const playGreetingVoice = useCallback(
    async (text: string): Promise<TifaVoicePlaybackResult> => {
      if (!voiceEnabled || greetingPlayedRef.current) {
        return { voiceJobId: null };
      }

      greetingPlayedRef.current = true;

      try {
        const result = await playTifaVoice(text, { voice: "tifa-default" });
        return { voiceJobId: result.jobId ?? null };
      } catch (err) {
        console.warn("Greeting voice playback error:", err);
        return { voiceJobId: null };
      }
    },
    [voiceEnabled]
  );

  const playReplyVoice = useCallback(
    async (text: string): Promise<TifaVoicePlaybackResult> => {
      if (!voiceEnabled || !text.trim()) {
        return { voiceJobId: null };
      }

      try {
        const result = await playTifaVoice(text, { voice: "tifa-default" });
        return { voiceJobId: result.jobId ?? null };
      } catch (err) {
        console.warn("Reply voice playback error:", err);
        return { voiceJobId: null };
      }
    },
    [voiceEnabled]
  );

  return {
    voiceEnabled,
    setVoiceEnabled,
    playGreetingVoice,
    playReplyVoice,
  };
}
