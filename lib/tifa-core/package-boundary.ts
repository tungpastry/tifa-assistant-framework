export type TifaFrameworkModuleName =
  | "tifa-core"
  | "tifa-runtime"
  | "tifa-provider-gateway"
  | "tifa-voice"
  | "tifa-data-connectors"
  | "tifa-widget";

export type TifaFrameworkModuleStatus = "stable-contracts" | "active-development" | "scaffold";

export interface TifaFrameworkModuleBoundary {
  name: TifaFrameworkModuleName;
  importPath: string;
  status: TifaFrameworkModuleStatus;
  owns: string[];
  doesNotOwn: string[];
  localFirstSafe: boolean;
}

export const TIFA_FRAMEWORK_MODULES: TifaFrameworkModuleBoundary[] = [
  {
    name: "tifa-core",
    importPath: "@/lib/tifa-core",
    status: "stable-contracts",
    owns: ["assistant contracts", "tenant contracts", "usage events", "audit events", "framework errors"],
    doesNotOwn: ["Next.js route handlers", "provider SDK calls", "browser UI"],
    localFirstSafe: true,
  },
  {
    name: "tifa-runtime",
    importPath: "@/lib/tifa-runtime",
    status: "active-development",
    owns: ["local runtime paths", "chat session persistence", "tenant context", "rate-limit adapter contracts"],
    doesNotOwn: ["LLM routing", "voice synthesis providers", "React widget presentation"],
    localFirstSafe: true,
  },
  {
    name: "tifa-provider-gateway",
    importPath: "@/lib/tifa-provider-gateway",
    status: "active-development",
    owns: ["LLM provider contracts", "Ollama/OpenAI/Gemini/Qwen adapters", "routing policies", "cost/privacy fallback policy"],
    doesNotOwn: ["prompt authoring", "chat history persistence", "provider secrets"],
    localFirstSafe: true,
  },
  {
    name: "tifa-voice",
    importPath: "@/lib/tifa-voice",
    status: "active-development",
    owns: ["voice provider contracts", "TTS jobs", "audio cache helpers", "worker heartbeat/status"],
    doesNotOwn: ["browser playback UI", "object storage credentials", "cloud model deployment"],
    localFirstSafe: true,
  },
  {
    name: "tifa-data-connectors",
    importPath: "@/lib/tifa-data-connectors",
    status: "active-development",
    owns: ["connector contracts", "PostgreSQL connector", "SQL safety", "Text-to-SQL planning and validation"],
    doesNotOwn: ["database migrations execution", "raw user SQL", "billing/accounting"],
    localFirstSafe: true,
  },
  {
    name: "tifa-widget",
    importPath: "@/lib/tifa-widget",
    status: "active-development",
    owns: ["browser client helpers", "React hooks", "widget contracts", "extension-point types"],
    doesNotOwn: ["assistant runtime storage", "LLM provider calls", "server-side rate limits"],
    localFirstSafe: true,
  },
];
