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

Local async TTS processing is available through `npm run tts:worker:once` for a single pass or `npm run tts:worker` for a loop. The worker only reads queued jobs from `runtime/tts_jobs` and writes generated WAV/cache metadata under `runtime/audio_cache`.

## 2. SaaS Framework Readiness

The repository now includes additive Tifa Assistant Framework scaffolds. Gemini CLI may inspect and update them, but must preserve local TradeVibe compatibility.

Current readiness surfaces:

- `/api/health` reports required local checks plus optional SaaS categories.
- `docs/OBSERVABILITY.md` defines target metrics and audit events.
- `docs/OPS_SOP.md` defines validation and incident triage commands.
- `sql/tifa_saas_schema.sql` is a schema draft only and is not applied in local mode.

Optional SaaS checks may report `disabled`. That is healthy for local-first TradeVibe unless strict SaaS mode is intentionally enabled.
