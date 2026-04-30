# Changelog

All notable changes to this project will be documented in this file.

This project follows a practical changelog format for Tifa Assistant Framework and the local-first TradeVibe reference app.

## [Unreleased]

### Added
- Added `GET /api/health` for runtime, Ollama, and Piper dependency checks.
- Added a standardized API error envelope with stable error codes, request IDs, retry hints, and client-safe details.
- Added local in-memory rate limiting for Tifa chat and voice endpoints.
- Added `POST /api/tifa/stream` as the Server-Sent Events streaming endpoint for ChatTifa.
- Added frontend streaming support for ChatTifa replies.
- Added fallback from streaming Tifa replies to the non-streaming `/api/tifa` endpoint when appropriate.
- Added cache-first voice job API:
  - `POST /api/voice/jobs`
  - `GET /api/voice/jobs/{jobId}`
  - `GET /api/voice/jobs/{jobId}/audio`
- Added filesystem-backed TTS audio cache under `runtime/audio_cache`.
- Added filesystem-backed voice job records under `runtime/tts_jobs`.
- Added binary WAV audio delivery for completed voice jobs.
- Added local filesystem TTS worker:
  - `scripts/tts-worker.mjs`
  - `npm run tts:worker`
  - `npm run tts:worker:once`
- Added runtime directory preparation for:
  - `runtime/daily_vibes`
  - `runtime/logs`
  - `runtime/audio_cache`
  - `runtime/tts_jobs`
- Added API smoke checks for Tifa streaming validation.
- Added optional live API smoke checks through `RUN_LIVE_SMOKE=1`.
- Added optional rate-limit smoke checks through `RUN_RATE_LIMIT_SMOKE=1`.

### Changed
- ChatTifa now prefers `/api/tifa/stream` for interactive replies.
- ChatTifa now falls back to `/api/tifa` when the streaming request fails before producing a usable answer.
- ChatTifa voice playback now uses `playTifaVoice()`.
- Tifa greeting voice and reply voice now prefer cached voice jobs before falling back to the legacy voice endpoint.
- Voice playback now fetches audio through job-based audio URLs instead of directly depending on base64 audio from the legacy endpoint.
- Piper model identity now derives the model display name from the configured model path.
- Runtime artifact handling now includes dedicated directories for TTS cache and TTS job state.
- API validation and timeout handling have been hardened across Tifa and voice endpoints.
- API smoke tests now cover both non-streaming and streaming Tifa validation paths.

### Fixed
- Fixed cache-hit voice jobs by persisting ready job records before returning the cached audio URL.
- Fixed frontend voice playback so it can use cached voice jobs for both greeting and assistant replies.
- Hardened Tifa stream completion handling to avoid broken stream endings.
- Hardened frontend fallback handling when Tifa streaming fails.
- Hardened chat error handling and audio object cleanup.
- Sanitized server-side error details so client responses only expose safe information.
- Cleaned up voice route migration behavior and timeout handling.

### Notes
- TradeVibe is currently a local-first, single-node, self-hosted application.
- The current rate limiter is in-memory and process-local. Multi-instance production deployment should replace it with Redis, a reverse proxy limiter, or a platform-level limiter.
- The voice job API is cache-first and job-shaped. Cache misses are queued as local filesystem jobs and processed by `scripts/tts-worker.mjs`.
- The current worker is a local filesystem worker, not a Redis/BullMQ production queue.
- The legacy `/api/voice?text=...` endpoint remains available as a fallback path.
- The current default TTS path still uses Piper. Vietnamese TTS integration can be added later through Piper Vietnamese voices, VieNeu-TTS, or a cloud TTS provider.

## [0.1.0] - 2025-10-20

### Refactored
- Migrated generated artifacts and logs to the `runtime/` directory paradigm.
- Decoupled generated runtime data from tracked source code.
- Switched package manager workflow from `pnpm` to `npm`.

### Added
- Added the initial TradeVibe daily vibe dashboard.
- Added the initial Tifa interactive AI chat feature.
- Added local execution pipeline using Ollama and Piper TTS.
- Added Python Insight Engine for daily trader mood, quote, playlist, and voice artifact generation.
- Added support for runtime daily vibe artifacts.
- Added initial documentation suite:
  - `README.md`
  - `docs/`
  - `CONTRIBUTING.md`
  - `CODE_OF_CONDUCT.md`
  - `LICENSE`
  - `CHANGELOG.md`
