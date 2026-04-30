"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  appendChatMessage,
  createChatSession,
  sendTifaMessage,
  streamTifaReply,
  type ChatMessageRole,
} from "./client";
import type { TifaWidgetMessage } from "./types";

export interface TifaChatOptions {
  mood: string;
  onGreeting?: (text: string) => Promise<{ voiceJobId?: string | null } | void>;
  onAssistantReply?: (text: string) => Promise<{ voiceJobId?: string | null } | void>;
}

function createMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `msg_${Date.now()}_${Math.random()}`;
}

function shouldFallback(err: unknown): boolean {
  if (err instanceof ApiRequestError) {
    return err.status ? err.status >= 500 : true;
  }

  return true;
}

export function useTifaChat(options: TifaChatOptions) {
  const { mood, onGreeting, onAssistantReply } = options;
  const moodLower = mood.toLowerCase();
  const [messages, setMessages] = useState<TifaWidgetMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [providerType, setProviderType] = useState<"local" | "cloud" | null>(null);

  const isMounted = useRef(false);
  const greetingInitializedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatSessionIdRef = useRef<string | null>(null);
  const chatSessionPromiseRef = useRef<Promise<string | null> | null>(null);

  const ensureChatSession = useCallback(async () => {
    if (chatSessionIdRef.current) return chatSessionIdRef.current;

    if (!chatSessionPromiseRef.current) {
      chatSessionPromiseRef.current = createChatSession({
        mood: moodLower,
        title: "TifaWidget",
      })
        .then((session) => {
          chatSessionIdRef.current = session.id;
          return session.id;
        })
        .catch((err) => {
          console.warn("Chat session persistence failed:", err);
          chatSessionPromiseRef.current = null;
          return null;
        });
    }

    return chatSessionPromiseRef.current;
  }, [moodLower]);

  const persistChatMessage = useCallback(
    async (
      role: ChatMessageRole,
      content: string,
      persistOptions?: { voiceJobId?: string | null; model?: string | null }
    ) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      try {
        const sessionId = await ensureChatSession();
        if (!sessionId) return;

        await appendChatMessage(sessionId, {
          role,
          content: trimmedContent,
          mood: moodLower,
          voice_job_id: persistOptions?.voiceJobId ?? null,
          model: persistOptions?.model ?? null,
        });
      } catch (err) {
        console.warn("Chat message persistence failed:", err);
      }
    },
    [ensureChatSession, moodLower]
  );

  const updateLastTifaMessage = useCallback((text: string) => {
    setMessages((current) => {
      const next = [...current];
      const lastIndex = next.length - 1;
      if (lastIndex >= 0 && next[lastIndex].sender === "tifa") {
        next[lastIndex] = { ...next[lastIndex], text };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (greetingInitializedRef.current) return;
    greetingInitializedRef.current = true;

    const greetText = "Hey trader, how are you feeling today?";
    setMessages([{ id: createMessageId(), sender: "tifa", text: greetText }]);
    void persistChatMessage("assistant", greetText);
    void onGreeting?.(greetText);
  }, [onGreeting, persistChatMessage]);

  const sendMessage = useCallback(async () => {
    const outgoingMessage = input.trim();
    if (!outgoingMessage || sending) return;

    setError(null);
    setSending(true);
    setTyping(true);

    const userMessage: TifaWidgetMessage = {
      id: createMessageId(),
      sender: "user",
      text: outgoingMessage,
    };
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: createMessageId(), sender: "tifa", text: "" },
    ]);
    void persistChatMessage("user", outgoingMessage);
    setInput("");

    abortControllerRef.current = new AbortController();
    let finalReply = "";
    let streamedText = "";
    let shouldPlayVoice = false;

    try {
      const result = await streamTifaReply({
        message: outgoingMessage,
        mood: moodLower,
        signal: abortControllerRef.current.signal,
        onStart: (event) => {
          setProvider(event.provider ?? null);
          setModel(event.model ?? null);
          setProviderType(event.providerType ?? null);
        },
        onDelta: (delta) => {
          setTyping(false);
          streamedText += delta;
          updateLastTifaMessage(streamedText);
        },
        onDone: (event) => {
          setProvider(event.provider ?? null);
          setModel(event.model ?? null);
          setProviderType(event.providerType ?? null);
        },
      });
      finalReply = result.text;
      setProvider(result.provider ?? null);
      setModel(result.model ?? null);
      setProviderType(result.providerType ?? null);
      if (result.completed && finalReply.trim()) {
        shouldPlayVoice = true;
      }
    } catch (streamErr) {
      console.error("Stream failed, considering fallback:", streamErr);
      if (streamedText.trim()) {
        finalReply = streamedText;
        setError("The stream was interrupted. The response may be incomplete.");
      } else if (shouldFallback(streamErr)) {
        try {
          setTyping(true);
          const fallbackReply = await sendTifaMessage(outgoingMessage, moodLower);
          finalReply = fallbackReply.text;
          setProvider(fallbackReply.provider ?? null);
          setModel(fallbackReply.model ?? null);
          setProviderType(fallbackReply.providerType ?? null);
          updateLastTifaMessage(finalReply);
          if (finalReply.trim()) {
            shouldPlayVoice = true;
          }
        } catch (fallbackErr) {
          console.error("Fallback also failed:", fallbackErr);
          const message = fallbackErr instanceof Error
            ? fallbackErr.message
            : "An unknown error occurred.";
          setError(message);
          setMessages((prev) => prev.slice(0, -1));
        }
      } else {
        const message = streamErr instanceof Error
          ? streamErr.message
          : "An unknown error occurred.";
        setError(message);
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      if (isMounted.current) {
        setTyping(false);
        setSending(false);
        let voiceJobId: string | null = null;
        if (shouldPlayVoice && finalReply.trim()) {
          const voiceResult = await onAssistantReply?.(finalReply);
          voiceJobId = voiceResult?.voiceJobId ?? null;
        }
        if (finalReply.trim()) {
          void persistChatMessage("assistant", finalReply, { voiceJobId });
        }
      }
    }
  }, [
    input,
    moodLower,
    onAssistantReply,
    persistChatMessage,
    sending,
    updateLastTifaMessage,
  ]);

  return {
    messages,
    input,
    setInput,
    typing,
    error,
    sending,
    provider,
    model,
    providerType,
    sendMessage,
  };
}
