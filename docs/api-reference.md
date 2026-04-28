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
  - **Codes:** `VALIDATION_ERROR` (400), `PAYLOAD_TOO_LARGE` (413), `UPSTREAM_AI_ERROR` (502), `AI_TIMEOUT` (504).

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
  - **Codes:** `VALIDATION_ERROR` (400), `PAYLOAD_TOO_LARGE` (413), `TTS_TIMEOUT` (504), `TTS_GENERATION_FAILED` (500).

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
