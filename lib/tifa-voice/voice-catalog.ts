export type TifaVoiceProviderReadiness = "default";

export interface TifaVoiceProviderCatalogEntry {
  id: "piper";
  displayName: string;
  readiness: TifaVoiceProviderReadiness;
  deployment: "local-binary";
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
];
