export type TifaVoiceProviderReadiness = "default" | "scaffold" | "facade";

export interface TifaVoiceProviderCatalogEntry {
  id: "piper" | "vipiper" | "vieneu";
  displayName: string;
  readiness: TifaVoiceProviderReadiness;
  deployment: "local-binary" | "local-compatible" | "http-facade";
  defaultLocale: string;
  env: string[];
  notes: string;
}

export const TIFA_VOICE_PROVIDER_CATALOG: TifaVoiceProviderCatalogEntry[] = [
  {
    id: "piper",
    displayName: "Piper",
    readiness: "default",
    deployment: "local-binary",
    defaultLocale: "en-US",
    env: ["PIPER_BIN", "PIPER_MODEL", "PIPER_TIMEOUT_MS"],
    notes: "Default local provider used by the filesystem TTS worker.",
  },
  {
    id: "vipiper",
    displayName: "viPiper",
    readiness: "scaffold",
    deployment: "local-compatible",
    defaultLocale: "vi-VN",
    env: ["TIFA_VIPIPER_ENABLED", "TIFA_VIPIPER_MODEL", "TIFA_VIPIPER_VOICE_ID"],
    notes: "Piper-compatible Vietnamese voice scaffold; disabled until explicitly configured.",
  },
  {
    id: "vieneu",
    displayName: "VieNeu facade",
    readiness: "facade",
    deployment: "http-facade",
    defaultLocale: "vi-VN",
    env: ["TIFA_VIENEU_ENABLED", "TIFA_VIENEU_BASE_URL", "TIFA_VIENEU_MODEL"],
    notes: "HTTP facade only; heavy model code must stay outside Next.js route handlers.",
  },
];
