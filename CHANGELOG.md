# Changelog

All notable changes to Tifa Assistant Framework are documented here.

## [Unreleased]

### Added
- Tifa Framework Dev Console as the root page.
- `TifaWidget` floating assistant UI.
- Streaming chat API through `POST /api/tifa/stream`.
- Non-streaming chat API through `POST /api/tifa`.
- Cache-first voice job API:
  - `POST /api/voice/jobs`
  - `GET /api/voice/jobs/{jobId}`
  - `GET /api/voice/jobs/{jobId}/audio`
- Local filesystem TTS worker:
  - `scripts/tts-worker.mjs`
  - `npm run tts:worker`
  - `npm run tts:worker:once`
- TTS worker heartbeat at `runtime/tts_worker_heartbeat.json`.
- Provider gateway scaffold with an Ollama-compatible provider.
- Voice provider scaffolds for Piper, viPiper, and VieNeu facade mode.
- Safe PostgreSQL connector scaffold.
- Guarded Text-to-SQL planning scaffold.
- SaaS schema and optional adapter scaffolds.

### Changed
- Runtime env names now use `TIFA_*`.
- Runtime directories are limited to assistant framework state, voice cache/jobs, logs, and chat sessions.
- Healthcheck now reports service `tifa-assistant-framework`.
- Root app no longer depends on external dashboard artifacts.

### Removed
- Removed dashboard artifact API routes and app coupling that were unrelated to the framework runtime.
- Removed generated artifact pipeline files that were not part of the assistant framework.

## [0.1.0]

Initial local-first assistant framework scaffold.
