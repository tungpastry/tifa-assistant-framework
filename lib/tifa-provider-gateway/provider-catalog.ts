export type TifaProviderDeploymentClass = "local" | "cloud";
export type TifaProviderReadiness = "default" | "live-ready" | "configured-only" | "placeholder";

export interface TifaProviderCatalogEntry {
  id: "ollama" | "openai" | "gemini" | "qwen";
  displayName: string;
  deployment: TifaProviderDeploymentClass;
  readiness: TifaProviderReadiness;
  env: string[];
  supportsGenerate: boolean;
  supportsStream: boolean;
  notes: string;
}

export const TIFA_PROVIDER_CATALOG: TifaProviderCatalogEntry[] = [
  {
    id: "ollama",
    displayName: "Ollama-compatible local provider",
    deployment: "local",
    readiness: "default",
    env: ["TIFA_API_URL", "OLLAMA_URL", "TIFA_MODEL"],
    supportsGenerate: true,
    supportsStream: true,
    notes: "Default local-first provider; keeps the legacy TIFA_API_URL contract.",
  },
  {
    id: "openai",
    displayName: "OpenAI",
    deployment: "cloud",
    readiness: "live-ready",
    env: ["OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_BASE_URL"],
    supportsGenerate: true,
    supportsStream: false,
    notes: "Non-streaming generation is implemented; streaming remains routed through fallback providers.",
  },
  {
    id: "gemini",
    displayName: "Gemini",
    deployment: "cloud",
    readiness: "live-ready",
    env: ["GEMINI_API_KEY", "GEMINI_MODEL", "GEMINI_API_URL"],
    supportsGenerate: true,
    supportsStream: false,
    notes: "Non-streaming generation is implemented through the Gemini REST API.",
  },
  {
    id: "qwen",
    displayName: "Qwen-compatible API",
    deployment: "cloud",
    readiness: "live-ready",
    env: ["QWEN_API_KEY", "QWEN_API_URL", "QWEN_MODEL"],
    supportsGenerate: true,
    supportsStream: false,
    notes: "Uses an OpenAI-compatible chat completions endpoint.",
  },
];
