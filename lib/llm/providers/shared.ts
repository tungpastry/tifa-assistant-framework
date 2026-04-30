import { createTextResponse } from "../provider";
import type { LlmRequest, LlmResponse } from "../types";

export function buildPrompt(input: LlmRequest) {
  if (input.metadata?.prebuiltPrompt === true && input.messages.length > 0) {
    return input.messages[0].content;
  }

  const lines = input.messages.map((message) => `${message.role}: ${message.content}`);
  return [input.systemPrompt, ...lines].filter(Boolean).join("\n");
}

export function resolveProviderModel(input: LlmRequest, provider: string, defaultModel: string) {
  if (input.provider === provider && input.model) {
    return input.model;
  }

  if (input.metadata?.forceModel === true && input.model) {
    return input.model;
  }

  return defaultModel;
}

export function toOpenAiMessages(input: LlmRequest) {
  if (input.metadata?.prebuiltPrompt === true && input.messages.length > 0) {
    return [{ role: "user", content: input.messages[0].content }];
  }

  return [
    ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
    ...input.messages.map((message) => ({
      role: message.role === "tool" ? "user" : message.role,
      content: message.content,
    })),
  ];
}

export function createProviderTextResponse(input: {
  text: string;
  provider: string;
  model: string;
  startedAt: number;
  raw?: unknown;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}): LlmResponse {
  const response = createTextResponse(input);
  if (input.usage) {
    const summedTokens = (input.usage.inputTokens ?? 0) + (input.usage.outputTokens ?? 0);
    response.usage = {
      ...response.usage,
      ...input.usage,
      totalTokens: input.usage.totalTokens
        ?? (summedTokens > 0 ? summedTokens : response.usage.totalTokens),
    };
  }
  return response;
}

export async function fetchJson(input: {
  url: string;
  apiKey?: string;
  body: unknown;
  timeoutMs: number;
  headers?: Record<string, string>;
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const res = await fetch(input.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
        ...input.headers,
      },
      body: JSON.stringify(input.body),
      signal: controller.signal,
    });

    const rawText = await res.text();
    const json = rawText ? JSON.parse(rawText) : {};

    if (!res.ok) {
      const message = typeof json?.error?.message === "string"
        ? json.error.message
        : `Provider returned ${res.status}`;
      throw new Error(message);
    }

    return json;
  } finally {
    clearTimeout(timeoutId);
  }
}
