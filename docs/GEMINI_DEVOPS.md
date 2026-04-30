# Gemini CLI DevOps Guide

Gemini CLI is a development and DevOps assistant for the `tifa-assistant-framework` repository.

## Repo Identity

```text
Repo: tifa-assistant-framework
Path: /home/nexus/projects/tifa-assistant-framework
Role: Local-first assistant framework
Frontend: Next.js 15.5.15 + React 19.1.0
Runtime: filesystem state under runtime/
Chat: TifaWidget with SSE streaming and non-streaming fallback
Voice: Piper-compatible TTS with cache-first jobs and local worker
AI backend: Ollama-compatible endpoint by default
```

## Safe Workflow

- Inspect before patching.
- Keep local-first mode working.
- Do not add secrets to the repository.
- Do not enable optional SaaS services by default.
- Validate with lint, build, smoke tests, and worker syntax checks.

## Local Worker

Use:

```bash
npm run tts:worker:once
npm run tts:worker
```

The worker reads queued jobs from `runtime/tts_jobs`, writes audio/cache metadata under `runtime/audio_cache`, and updates `runtime/tts_worker_heartbeat.json`.
