"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, Send, Volume2, VolumeX, X } from "lucide-react";
import { useTifaChat, useTifaVoice } from "@/lib/tifa-widget";

const moodAccents: Record<string, string> = {
  happy: "#47e6b1",
  confident: "#9a7bff",
  focused: "#57e8ff",
  anxious: "#f7c65c",
  tired: "#7f8daa",
};

interface TifaWidgetProps {
  mood: string;
  defaultOpen?: boolean;
}

export default function TifaWidget({ mood, defaultOpen = false }: TifaWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAiDetails, setShowAiDetails] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();
  const {
    voiceEnabled,
    setVoiceEnabled,
    selectedVoice,
    setSelectedVoice,
    voiceOptions,
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
    provider,
    model,
    providerType,
    sendMessage,
  } = useTifaChat({
    mood,
    active: isOpen,
    onGreeting: playGreetingVoice,
    onAssistantReply: playReplyVoice,
  });

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [isOpen, messages, reduceMotion, typing]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 112 ? "auto" : "hidden";
  }, [input]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showAiDetails) {
        setShowAiDetails(false);
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, showAiDetails]);

  const moodLower = mood.toLowerCase();
  const avatarSrc = `/tifa_${moodLower}.png`;
  const moodAccent = moodAccents[moodLower] ?? moodAccents.tired;
  const aiModeLabel = providerType === "cloud" ? "Cloud AI" : providerType === "local" ? "Local AI" : "AI assistant";
  const transition = { duration: reduceMotion ? 0 : 0.2, ease: "easeOut" as const };
  const widgetStyle = { "--mood-accent": moodAccent } as CSSProperties;

  return (
    <div
      className="fixed z-50"
      style={{
        ...widgetStyle,
        right: "max(0.75rem, env(safe-area-inset-right))",
        bottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isOpen ? (
          <motion.button
            key="launcher"
            type="button"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
            transition={transition}
            className="group relative grid size-16 place-items-center rounded-[1.35rem] border border-[var(--control-border)] bg-[var(--surface)] shadow-[0_20px_55px_-22px_var(--shadow-color)] transition hover:-translate-y-1"
            aria-label="Open Tifa AI assistant"
            data-testid="tifa-launcher"
          >
            <span aria-hidden="true" className="absolute -inset-1 rounded-[1.55rem] border border-[var(--mood-accent)] opacity-30 transition group-hover:opacity-70" />
            <Image src={avatarSrc} alt="" width={52} height={52} className="size-[3.25rem] rounded-2xl object-cover" />
            <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-[var(--surface)] bg-[var(--success)] shadow-[0_0_14px_var(--success)] motion-safe:animate-pulse" />
          </motion.button>
        ) : (
          <motion.section
            key="panel"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 10, scale: reduceMotion ? 1 : 0.98 }}
            transition={transition}
            className="aurora-panel flex h-[min(80dvh,620px)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.75rem] sm:w-[400px]"
            aria-label="Tifa AI assistant"
            data-testid="tifa-panel"
          >
            <header className="relative flex min-h-[5.25rem] items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--mood-accent)] to-transparent" />
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src={avatarSrc}
                  alt="Tifa AI avatar"
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-2xl border object-cover shadow-md"
                  style={{ borderColor: moodAccent }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold tracking-[-0.02em]">Tifa</h2>
                    <button
                      type="button"
                      onClick={() => setShowAiDetails((current) => !current)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--control-border)] hover:text-[var(--foreground)]"
                      aria-expanded={showAiDetails}
                      aria-controls="tifa-ai-details"
                      aria-label={`${aiModeLabel} details`}
                    >
                      <Info size={12} aria-hidden="true" />
                      {aiModeLabel}
                    </button>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs capitalize text-[var(--text-muted)]">
                    <span className="size-1.5 rounded-full bg-[var(--success)]" />
                    {moodLower} · online
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="grid size-11 place-items-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                  aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
                  title={voiceEnabled ? "Disable voice" : "Enable voice"}
                >
                  {voiceEnabled ? <Volume2 size={19} aria-hidden="true" /> : <VolumeX size={19} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAiDetails(false);
                    setIsOpen(false);
                  }}
                  className="grid size-11 place-items-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                  aria-label="Close Tifa AI assistant"
                  title="Close assistant"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <AnimatePresence>
                {showAiDetails && (
                  <motion.div
                    id="tifa-ai-details"
                    role="dialog"
                    aria-label="AI processing details"
                    initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                    transition={transition}
                    className="absolute left-3 right-3 top-[4.75rem] z-20 rounded-2xl border border-[var(--control-border)] bg-[var(--surface)] p-4 shadow-2xl"
                  >
                    <p className="text-sm font-semibold">AI processing details</p>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                      <dt className="text-[var(--text-muted)]">Provider</dt>
                      <dd className="mono-label truncate text-right text-[var(--text-secondary)]">{provider ?? "Automatic routing"}</dd>
                      <dt className="text-[var(--text-muted)]">Model</dt>
                      <dd className="mono-label truncate text-right text-[var(--text-secondary)]">{model ?? "Selected at runtime"}</dd>
                      <dt className="text-[var(--text-muted)]">Processing</dt>
                      <dd className="capitalize text-right text-[var(--text-secondary)]">{providerType ?? "Automatic"}</dd>
                      <dt className="text-[var(--text-muted)]">Voice</dt>
                      <dd className="text-right text-[var(--text-secondary)]">Piper · local TTS</dd>
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>
            </header>

            <div className="scrollbar-aurora flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-label="Conversation with Tifa" aria-live="polite">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={transition}
                    className={message.sender === "user" ? "ml-auto max-w-[86%]" : "mr-auto max-w-[88%]"}
                  >
                    {message.sender === "tifa" && <p className="mb-1.5 pl-1 text-xs font-semibold text-[var(--text-muted)]">Tifa</p>}
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-3.5 py-3 text-[15px] leading-6 ${
                        message.sender === "user"
                          ? "rounded-br-md bg-[var(--primary)] text-[var(--primary-contrast)]"
                          : "rounded-bl-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]"
                      }`}
                    >
                      {message.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {typing && (
                <div className="mr-auto max-w-[88%]" role="status">
                  <p className="mb-1.5 pl-1 text-xs font-semibold text-[var(--text-muted)]">Tifa is thinking</p>
                  <div className="flex w-fit gap-1.5 rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3.5 text-[var(--primary)]">
                    {[0, 1, 2].map((dot) => (
                      <span key={dot} className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" style={{ animationDelay: `${dot * 160}ms` }} />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div role="alert" className="rounded-xl border border-[var(--error)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm leading-5 text-[var(--error)]">
                  {error}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-[var(--border)] bg-[var(--surface)] p-3">
              {voiceOptions.length > 1 && (
                <label className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
                  Voice
                  <select
                    value={selectedVoice}
                    onChange={(event) => {
                      if (event.target.value === "tifa-default") {
                        setSelectedVoice(event.target.value);
                      }
                    }}
                    className="min-h-9 rounded-lg border border-[var(--control-border)] bg-[var(--surface-elevated)] px-2 text-xs text-[var(--foreground)]"
                  >
                    {voiceOptions.map((voice) => (
                      <option key={`${voice.provider}:${voice.id}`} value={voice.id}>{voice.locale}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex items-end gap-2 rounded-2xl border border-[var(--control-border)] bg-[var(--surface-elevated)] p-1.5 transition focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={sending ? "Tifa is replying..." : "Ask Tifa anything..."}
                  disabled={sending}
                  className="scrollbar-aurora min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60"
                  aria-label="Message Tifa"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || !input.trim()}
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                  title="Send message"
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 px-1 text-xs text-[var(--text-muted)]">Enter to send · Shift+Enter for a new line</p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
