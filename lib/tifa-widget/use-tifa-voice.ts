"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getVoiceProviders,
  playTifaVoice,
  type TifaVoiceId,
  type VoiceOption,
} from "./client";

export interface TifaVoicePlaybackResult {
  voiceJobId: string | null;
}

export function useTifaVoice(defaultEnabled = true) {
  const [voiceEnabled, setVoiceEnabled] = useState(defaultEnabled);
  const [selectedVoice, setSelectedVoice] = useState<TifaVoiceId>("tifa-default");
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const greetingPlayedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    getVoiceProviders()
      .then((result) => {
        if (cancelled) return;
        const enabledVoices = result.voices.filter(
          (voice) => voice.enabled && voice.provider === "piper" && voice.id === "tifa-default"
        );
        setVoiceOptions(enabledVoices);
        if (!enabledVoices.some((voice) => voice.id === selectedVoice)) {
          setSelectedVoice("tifa-default");
        }
      })
      .catch((err) => console.warn("Voice provider discovery failed:", err));

    return () => {
      cancelled = true;
    };
  }, [selectedVoice]);

  const playGreetingVoice = useCallback(
    async (text: string): Promise<TifaVoicePlaybackResult> => {
      if (!voiceEnabled || greetingPlayedRef.current) {
        return { voiceJobId: null };
      }

      greetingPlayedRef.current = true;

      try {
        const result = await playTifaVoice(text, { voice: selectedVoice });
        return { voiceJobId: result.jobId ?? null };
      } catch (err) {
        console.warn("Greeting voice playback error:", err);
        return { voiceJobId: null };
      }
    },
    [selectedVoice, voiceEnabled]
  );

  const playReplyVoice = useCallback(
    async (text: string): Promise<TifaVoicePlaybackResult> => {
      if (!voiceEnabled || !text.trim()) {
        return { voiceJobId: null };
      }

      try {
        const result = await playTifaVoice(text, { voice: selectedVoice });
        return { voiceJobId: result.jobId ?? null };
      } catch (err) {
        console.warn("Reply voice playback error:", err);
        return { voiceJobId: null };
      }
    },
    [selectedVoice, voiceEnabled]
  );

  return {
    voiceEnabled,
    setVoiceEnabled,
    selectedVoice,
    setSelectedVoice,
    voiceOptions,
    playGreetingVoice,
    playReplyVoice,
  };
}
