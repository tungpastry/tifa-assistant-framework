export type TifaWidgetMode = "floating" | "embedded" | "mobile-sheet";

export interface TifaWidgetAssistantIdentity {
  assistantId: string;
  tenantId?: string;
  displayName: string;
  avatarMoodPattern: string;
}

export interface TifaWidgetPolicies {
  voiceEnabled: boolean;
  showProviderBadge: boolean;
  showToolTrace: boolean;
  showCitations: boolean;
  showQuotaBadge: boolean;
}

export interface TifaWidgetConfig {
  mode: TifaWidgetMode;
  assistant: TifaWidgetAssistantIdentity;
  locale: string;
  defaultMood: string;
  policies: TifaWidgetPolicies;
}

export interface TifaWidgetMessage {
  id: string;
  sender: "tifa" | "user";
  text: string;
}
