# Gemini CLI DevOps Guide — TradeVibe

This guide defines how Gemini CLI should be used inside the `tradevibe-org` repository.

Gemini CLI is a **development and DevOps assistant only**. It must help inspect, plan, patch, validate, and document the repo. It must not act as the runtime Tifa assistant and must not generate fake runtime artifacts.

---

## 1. Current Repo Identity

```text
Repo: tradevibe-org
Path: /home/nexus/projects/tradevibe-org
Server profile: Ubuntu Server 192.168.1.30, user nexus
Role: Local-first AI trader companion
Frontend: Next.js 15.5.5 + React 19.1.0
Runtime: filesystem artifacts under runtime/
Chat: ChatTifa with SSE streaming and non-streaming fallback
Voice: Piper TTS with cache-first voice jobs and legacy fallback
AI backend: local Ollama-compatible endpoint
Deployment: single-node self-hosted foundation
```

Runtime cleanup is available through `npm run cleanup:runtime`. The command is a dry-run by default and only scopes deletion to `runtime/audio_cache`, `runtime/tts_jobs`, and `runtime/logs`.
