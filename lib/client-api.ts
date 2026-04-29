// This file contains shared helper utilities for the frontend client.

/**
 * A type guard for the standardized API error envelope.
 */
export interface ApiErrorEnvelope {
  error?: {
    code: string;
    message: string;
    request_id?: string;
    retryable?: boolean;
    details?: unknown;
  };
}

/**
 * A custom error class for API requests.
 */
export class ApiRequestError extends Error {
  status?: number;
  code?: string;
  retryable?: boolean;

  constructor(message: string, options?: { status?: number; code?: string; retryable?: boolean }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options?.status;
    this.code = options?.code;
    this.retryable = options?.retryable;
  }
}

/**
 * Safely extracts an error message from an API response.
 * @param data The raw data from a `res.json()` call.
 * @param fallback A fallback message if one cannot be found.
 * @returns A user-friendly error message.
 */
export function getApiErrorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object" &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }
  return fallback;
}

/**
 * Converts a base64 string to a Blob object.
 */
export function b64ToBlob(b64: string, type: string = "application/octet-stream"): Blob {
  try {
    const bin = atob(b64);
    const arr = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new Blob([arr], { type });
  } catch (e) {
    console.error("Failed to decode base64 string:", e);
    return new Blob();
  }
}

/**
 * Creates an audio player from a base64 string and plays it.
 * It automatically handles the cleanup of the Object URL.
 */
export async function playBase64Audio(
  audioBase64: string,
  contentType: string = "audio/wav"
): Promise<void> {
  if (!audioBase64) return Promise.resolve();
  
  const blob = b64ToBlob(audioBase64, contentType);
  if (blob.size === 0) {
    console.warn("Skipping playback for empty audio blob.");
    return;
  }

  const url = URL.createObjectURL(blob);
  const player = new Audio(url);

  return new Promise((resolve, reject) => {
    const cleanup = () => URL.revokeObjectURL(url);
    player.addEventListener("ended", () => { cleanup(); resolve(); });
    player.addEventListener("error", (e) => { cleanup(); console.error("Audio playback error", e); reject(player.error); });
    player.play().catch((err) => { cleanup(); reject(err); });
  });
}

/**
 * Sends a message to the non-streaming Tifa endpoint.
 * @returns The full reply from Tifa.
 */
export async function sendTifaMessage(message: string, mood?: string): Promise<string> {
  const res = await fetch("/api/tifa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mood }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiRequestError(getApiErrorMessage(errorData, "The AI service failed to respond."), {
      status: res.status,
      code: (errorData as ApiErrorEnvelope).error?.code,
    });
  }

  const data = await res.json();
  return data.reply || "";
}

export type TifaStreamEvent =
  | { type: "start"; model?: string }
  | { type: "delta"; text: string }
  | { type: "done"; model?: string }
  | { type: "error"; code?: string; message: string };

/**
 * Streams a reply from the Tifa SSE endpoint.
 */
export async function streamTifaReply(options: {
  message: string;
  mood?: string;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onStart?: (model?: string) => void;
  onDone?: (model?: string) => void;
  onError?: (message: string, code?: string) => void;
}): Promise<{ text: string; completed: boolean }> {
  const res = await fetch("/api/tifa/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: options.message, mood: options.mood }),
    signal: options.signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiRequestError(getApiErrorMessage(errorData, "Failed to start stream."), {
      status: res.status,
      code: (errorData as ApiErrorEnvelope).error?.code,
    });
  }

  if (!res.body) {
    throw new Error("Streaming response body is empty.");
  }

  let fullText = "";
  let done = false;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (readerDone) {
      done = true;
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");

    for (let i = 0; i < lines.length - 1; i++) {
      const chunk = lines[i];
      if (chunk.startsWith("event: ")) {
        const eventMatch = chunk.match(/event: (.*)/);
        const dataMatch = chunk.match(/data: (.*)/);
        if (eventMatch && dataMatch) {
          const eventType = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          switch (eventType) {
            case "start":
              options.onStart?.(data.model);
              break;
            case "delta":
              fullText += data.text;
              options.onDelta(data.text);
              break;
            case "done":
              done = true;
              options.onDone?.(data.model);
              break;
            case "error":
              options.onError?.(data.message, data.code);
              // Stop processing on stream error
              done = true; 
              break;
          }
        }
      }
    }
    buffer = lines[lines.length - 1];
  }

  return { text: fullText, completed: true };
}
