import type { ReactNode } from "react";
import type { TifaWidgetMessage } from "./types";
import type { VoiceOption } from "./client";

export interface TifaWidgetRenderContext {
  assistantName: string;
  mood: string;
  provider?: string | null;
  model?: string | null;
  providerType?: "local" | "cloud" | "unknown" | null;
  voiceEnabled: boolean;
  selectedVoice?: string;
}

export interface TifaWidgetRenderers {
  renderMessage?: (message: TifaWidgetMessage, context: TifaWidgetRenderContext) => ReactNode;
  renderProviderBadge?: (context: TifaWidgetRenderContext) => ReactNode;
  renderVoiceOption?: (voice: VoiceOption, context: TifaWidgetRenderContext) => ReactNode;
  renderEmptyState?: (context: TifaWidgetRenderContext) => ReactNode;
}

export interface TifaWidgetCallbacks {
  onMessageSent?: (message: TifaWidgetMessage) => void;
  onAssistantReply?: (message: TifaWidgetMessage) => void;
  onError?: (error: Error) => void;
  onVoiceChanged?: (voiceId: string) => void;
  onProviderChanged?: (provider: string, model?: string | null) => void;
}

export interface TifaWidgetExtensionPoints {
  renderers?: TifaWidgetRenderers;
  callbacks?: TifaWidgetCallbacks;
}
