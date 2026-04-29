# API Reference

The Next.js backend exposes several endpoints used by the frontend to access runtime artifacts and interact with local AI services.

## `GET /api/today`

Retrieves the latest daily vibe bundle. This endpoint intelligently finds the most recent data available.

- **Success Response (200 OK):**
  - **Description:** Returns a JSON object with the complete vibe package. The `audio` field contains a base64-encoded WAV file.
  - **Logic:**
    1.  It first attempts to read the `runtime/latest.json` manifest.
    2.  If the manifest is unavailable or its artifacts are missing, it falls back to scanning the `runtime/daily_vibes/` directory for the most recent `music_*.json` file.
    3.  It then pieces together the corresponding `vibe_*.json` and `vibe_*.wav` files.
  - **Shape:**
    ```json
    {
      "date": "YYYY-MM-DD",
      "mood": "string",
      "vibe": "string (motivational quote)",
      "spotify": [{ "title": "...", "url": "..." }],
      "youtube": [{ "title": "...", "url": "..." }],
      "audio": "string (base64 WAV audio data) | null",
      "created_at": "ISO 8601 string"
    }
    ```

- **Error Response (500 Internal Server Error):**
  - **Description:** Returned if no runtime artifacts can be found.

## `GET /api/playlist?mood={mood}`

Returns the most recent curated music playlist for a given mood.

- **Query Params:**
  - `mood` (string, required): The mood to search for (e.g., `focused`, `happy`).
- **Success Response (200 OK):**
  - **Shape:**
    ```json
    {
      "mood": "string",
      "spotify": [{ "title": "...", "url": "..." }],
      "youtube": [{ "title": "...", "url": "..." }]
    }
    ```
- **Error Response (404 Not Found):**
  - **Description:** Returned if no playlist is found for the specified mood.

## `POST /api/tifa`

Proxies a chat message to the Tifa AI assistant (local LLM). This is a simple, non-streaming request/response.

- **Request Body:**
  ```json
  {
    "message": "string (The user's chat message)"
  }
  ```
- **Success Response (200 OK):**
  - **Shape:**
    ```json
    {
      "reply": "string (Tifa's response)",
      "model": "string (Name of the model used)"
    }
    ```
- **Error Responses:** All error responses now follow the standardized error envelope:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "A descriptive error message.",
      "request_id": "uuid",
      "retryable": false
    }
  }
  ```
  - **Codes:** `VALIDATION_ERROR` (400), `PAYLOAD_TOO_LARGE` (413), `UPSTREAM_AI_ERROR` (502), `AI_TIMEOUT` (504), `RATE_LIMITED` (429). The `RATE_LIMITED` error may include `details: { "retry_after_seconds": ... }`.

## `POST /api/tifa/stream`

Streams a Tifa chat response using Server-Sent Events (SSE). This is the preferred endpoint for interactive, real-time frontend experiences.

- **Note:** The frontend has not yet been switched to use this endpoint.
- **Request Body:**
  ```json
  {
    "message": "string (The user's chat message)"
  }
  ```
- **Pre-stream Error Responses:** Before the SSE connection is established, the endpoint can return standard JSON errors for validation issues:
  - `400 VALIDATION_ERROR`
  - `413 PAYLOAD_TOO_LARGE`
  - `429 RATE_LIMITED`
  - `502 UPSTREAM_AI_ERROR`
  - `504 AI_TIMEOUT`
- **SSE Event Stream:**
  - `event: start` - Sent once at the beginning of a successful stream.
    - `data: {"model":"<model-name>"}`
  - `event: delta` - Sent for each piece of the response from the AI.
    - `data: {"text":"..."}`
  - `event: done` - Sent once at the very end of a successful stream.
    - `data: {"model":"<model-name>"}`
  - `event: error` - Sent if an error occurs during the stream.
    - `data: {"code":"ERROR_CODE","message":"..."}`

## `GET /api/voice?text={text}`

Generates audio from text using the local Piper TTS engine.

- **Implementation:** `app/api/voice/route.ts` (Previously `pages/api/voice.ts`)
- **Query Params:**
  - `text` (string, required): The text to synthesize into speech.
- **Success Response (200 OK):**
  - **Description:** Returns a JSON object containing the base64-encoded WAV audio.
  - **Shape:**
    ```json
    {
      "voice": "string (Voice identifier)",
      "model": "string (Name of the model used)",
      "audio": "string (base64 WAV audio data)"
    }
    ```
- **Error Responses:** Uses the standardized error envelope.
  - **Codes:** `VALIDATION_ERROR` (400), `PAYLOAD_TOO_LARGE` (413), `TTS_TIMEOUT` (504), `TTS_GENERATION_FAILED` (500), `RATE_LIMITED` (429). The `RATE_LIMITED` error may include `details: { "retry_after_seconds": ... }`.

## `POST /api/voice/jobs`

Creates a new voice generation job. This is a cache-first API; however, the current implementation generates the audio immediately and synchronously on a cache miss.

- **Note:** The legacy `/api/voice?text=...` endpoint remains available for backward compatibility. The frontend has not yet been switched to use voice jobs.
- **Request Body:**
  ```json
  {
    "text": "string (The text to synthesize, max 500 chars)",
    "voice": "string (Optional, defaults to tifa-default)",
    "format": "string (Optional, defaults to wav)"
  }
  ```
- **Success Response (200 OK):**
  - **Description:** Returns the job status and details, including whether it was a cache hit.
  - **Shape:**
    ```json
    {
      "status": "ready" | "processing" | "queued" | "failed",
      "cache_hit": boolean,
      "job_id": "string (e.g., tts_12345)",
      "audio_url": "string (URL to fetch the binary audio)",
      "voice": "string",
      "model": "string"
    }
    ```
- **Error Responses:** Uses the standardized error envelope.
  - **Codes:** `VALIDATION_ERROR` (400), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429), `TTS_GENERATION_FAILED` (500), `TTS_TIMEOUT` (504).

## `GET /api/voice/jobs/{jobId}`

Retrieves the status of a specific voice job.

- **Success Response (200 OK):**
  - **Shape:**
    ```json
    {
      "job_id": "string",
      "status": "ready" | "processing" | "queued" | "failed",
      "cache_key": "string",
      "audio_url": "string | null",
      "error": "string | null",
      "voice": "string",
      "model": "string",
      "created_at": "ISO 8601 string",
      "updated_at": "ISO 8601 string"
    }
    ```
- **Error Responses:** Uses the standardized error envelope.
  - **Codes:** `VALIDATION_ERROR` (404, if job not found).

## `GET /api/voice/jobs/{jobId}/audio`

Retrieves the generated binary WAV audio for a completed job.

- **Success Response (200 OK):**
  - **Description:** Returns the binary WAV file data.
  - **Headers:**
    - `Content-Type: audio/wav`
    - `Cache-Control: public, max-age=86400`
- **Error Responses:** Uses the standardized error envelope.
  - **Codes:** `VALIDATION_ERROR` (400, if ID missing; 404, if job not found; 409, if job not ready), `INTERNAL_ERROR` (404, if audio file is missing).

## `GET /api/health`

Performs a health check on the service and its dependencies (runtime directories, Ollama, Piper).

- **Success Response (200 OK or 503 Service Unavailable):**
  - **Description:** Returns a JSON object with the overall system status and details for each component check. The HTTP status is `200` if the overall status is `ok` or `degraded`, and `503` if it is `down`.
  - **Shape:**
    ```json
    {
      "status": "ok" | "degraded" | "down",
      "service": "tradevibe",
      "timestamp": "ISO 8601 string",
      "checks": {
        "runtime": { "status": "ok", "details": { ... } },
        "ollama": { "status": "ok", "details": { ... } },
        "piper": { "status": "ok", "details": { ... } }
      }
    }
    ```
