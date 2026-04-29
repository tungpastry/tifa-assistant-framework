export type VoiceProviderName = "piper" | "vipiper" | "vieneu" | "openai" | "custom";

export type VoiceLicenseClass = "apache-2.0" | "mit" | "commercial" | "cc-by-nc" | "unknown" | string;

export interface VoiceSynthesisInput {
  text: string;
  outputPath: string;
  voiceId?: string;
  modelId?: string;
  format?: "wav" | "mp3" | "ogg";
  locale?: string;
  tenantId?: string;
  assistantId?: string;
  sessionId?: string;
}

export interface VoiceSynthesisResult {
  outputPath: string;
  provider: VoiceProviderName | string;
  voiceId: string;
  modelId: string;
  format: string;
  latencyMs: number;
}

export interface VoiceProviderHealth {
  provider: VoiceProviderName | string;
  status: "ok" | "degraded" | "disabled" | "down";
  details?: Record<string, unknown>;
}

export interface VoiceInfo {
  id: string;
  name: string;
  locale: string;
  modelId: string;
  licenseClass: VoiceLicenseClass;
}

export interface VoiceProviderCapabilities {
  supportsStreaming: boolean;
  supportsVoiceCloning: boolean;
  licenseClass: VoiceLicenseClass;
}

export interface VoiceProvider extends VoiceProviderCapabilities {
  name: VoiceProviderName | string;
  synthesizeToFile(input: VoiceSynthesisInput): Promise<VoiceSynthesisResult>;
  health(): Promise<VoiceProviderHealth>;
  getVoices(): Promise<VoiceInfo[]>;
  estimateLatency?(input: VoiceSynthesisInput): Promise<number>;
}

