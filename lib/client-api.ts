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
  let receivedDone = false;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done: readerDone } = await reader.read();
    if (readerDone) {
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
          let data: unknown;
          try {
            data = JSON.parse(dataMatch[1]);
          } catch {
            console.error("Failed to parse SSE data chunk:", dataMatch[1]);
            throw new ApiRequestError("Failed to parse Tifa stream event.");
          }

          const eventType = eventMatch[1];
          const eventData = data as { [key: string]: unknown };
          switch (eventType) {
            case "start":
              options.onStart?.(eventData.model as string | undefined);
              break;
            case "delta":
              if(typeof eventData.text === "string") {
                fullText += eventData.text;
                options.onDelta(eventData.text);
              }
              break;
            case "done":
              receivedDone = true;
              options.onDone?.(eventData.model as string | undefined);
              return { text: fullText, completed: receivedDone }; // End of stream
            case "error":
              const message = typeof eventData.message === "string" ? eventData.message : "Tifa stream failed.";
              const code = typeof eventData.code === "string" ? eventData.code : undefined;
              options.onError?.(message, code);
              throw new ApiRequestError(message, { code });
          }
        }
      }
    }
    buffer = lines[lines.length - 1];
  }

  return { text: fullText, completed: receivedDone };
}

export type VoiceJobStatus = "queued" | "processing" | "ready" | "failed";

export interface VoiceJobResponse {
  status: VoiceJobStatus;
  cache_hit?: boolean;
  job_id: string;
  audio_url: string | null;
  voice?: string;
  model?: string;
  error?: string | null;
}

export async function createVoiceJob(
  text: string,
  options?: { voice?: string; format?: string; signal?: AbortSignal }
): Promise<VoiceJobResponse> {
  const res = await fetch("/api/voice/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice: options?.voice ?? "tifa-default",
      format: options?.format ?? "wav",
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiRequestError(
      getApiErrorMessage(errorData, "Failed to create voice job."),
      { status: res.status, code: (errorData as ApiErrorEnvelope).error?.code }
    );
  }

  const data = await res.json();
  if (!data.status || !data.job_id) {
    throw new ApiRequestError("Invalid voice job response.");
  }
  return data as VoiceJobResponse;
}

export async function getVoiceJob(
  jobId: string,
  options?: { signal?: AbortSignal }
): Promise<VoiceJobResponse> {
  const res = await fetch(`/api/voice/jobs/${encodeURIComponent(jobId)}`, {
    signal: options?.signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiRequestError(
      getApiErrorMessage(errorData, "Failed to get voice job status."),
      { status: res.status, code: (errorData as ApiErrorEnvelope).error?.code }
    );
  }

  return (await res.json()) as VoiceJobResponse;
}

export async function playAudioUrl(audioUrl: string): Promise<void> {
  const player = new Audio(audioUrl);
  player.preload = "auto";
  return new Promise((resolve, reject) => {
    player.addEventListener("ended", () => resolve());
    player.addEventListener("error", () => reject(player.error));
    player.play().catch(reject);
  });
}

export async function playVoiceJobAudio(
  text: string,
  options?: {
    voice?: string;
    format?: string;
    signal?: AbortSignal;
    pollIntervalMs?: number;
    maxPollAttempts?: number;
  }
): Promise<{ used: "job"; cacheHit?: boolean; jobId: string }> {
  let response = await createVoiceJob(text, options);

  if (response.status === "ready" && response.audio_url) {
    await playAudioUrl(response.audio_url);
    return { used: "job", cacheHit: response.cache_hit, jobId: response.job_id };
  }

  const pollInterval = options?.pollIntervalMs ?? 1000;
  const maxAttempts = options?.maxPollAttempts ?? 10;
  let attempts = 0;

  while (
    (response.status === "queued" || response.status === "processing") &&
    attempts < maxAttempts
  ) {
    await new Promise((r) => setTimeout(r, pollInterval));
    response = await getVoiceJob(response.job_id, { signal: options?.signal });
    attempts++;

    if (response.status === "ready" && response.audio_url) {
      await playAudioUrl(response.audio_url);
      return { used: "job", cacheHit: response.cache_hit, jobId: response.job_id };
    }
  }

  if (response.status === "failed") {
    throw new ApiRequestError(response.error || "Voice job failed.");
  }

  if (response.status === "ready" && !response.audio_url) {
    throw new ApiRequestError("Voice job is ready but has no audio URL.");
  }

  throw new ApiRequestError("Voice job did not finish in time.");
}

export async function playLegacyVoice(
  text: string,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const res = await fetch(`/api/voice?text=${encodeURIComponent(text)}`, {
    signal: options?.signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiRequestError(
      getApiErrorMessage(errorData, "Legacy voice fetch failed."),
      { status: res.status, code: (errorData as ApiErrorEnvelope).error?.code }
    );
  }

  const data = await res.json();
  if (data.audio) {
    await playBase64Audio(data.audio, "audio/wav");
  } else {
    throw new ApiRequestError("Legacy voice endpoint returned no audio.");
  }
}

export async function playTifaVoice(
  text: string,
  options?: { voice?: string; signal?: AbortSignal }
): Promise<{ used: "job" | "legacy"; cacheHit?: boolean; jobId?: string }> {
  try {
    return await playVoiceJobAudio(text, options);
  } catch (err) {
    console.warn("Cached voice job failed, falling back to legacy voice endpoint:", err);
    await playLegacyVoice(text, options);
    return { used: "legacy" };
  }
}
