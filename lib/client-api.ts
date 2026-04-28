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
 * @param b64 The base64 encoded data.
 * @param type The content type of the blob.
 * @returns A Blob object.
 */
export function b64ToBlob(b64: string, type: string = "application/octet-stream"): Blob {
  try {
    const bin = atob(b64);
    const arr = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new Blob([arr], { type });
  } catch (e) {
    console.error("Failed to decode base64 string:", e);
    return new Blob(); // Return empty blob on error
  }
}

/**
 * Creates an audio player from a base64 string and plays it.
 * It automatically handles the cleanup of the Object URL.
 * @param audioBase64 The base64 encoded audio data.
 * @param contentType The content type of the audio.
 */
export async function playBase64Audio(
  audioBase64: string,
  contentType: string = "audio/wav"
): Promise<void> {
  if (!audioBase64) {
    return Promise.resolve();
  }
  
  const blob = b64ToBlob(audioBase64, contentType);
  if (blob.size === 0) {
    console.warn("Skipping playback for empty audio blob.");
    return;
  }

  const url = URL.createObjectURL(blob);
  const player = new Audio(url);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    player.addEventListener("ended", () => {
      cleanup();
      resolve();
    });
    player.addEventListener("error", (e) => {
      cleanup();
      console.error("Audio playback error", e);
      reject(player.error);
    });

    player.play().catch((err) => {
      cleanup();
      reject(err);
    });
  });
}
