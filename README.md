# TradeVibe

TradeVibe is a Next.js frontend plus a small Python insight pipeline that generates a daily trader mood, vibe quote, voice clip, and playlist bundle.

## Stack

- Next.js 15 / React 19
- App Router + legacy Pages API routes
- Local Ollama models for vibe/chat generation
- Piper for local TTS
- YouTube + Spotify APIs for playlist lookup
- PM2 or systemd for process management

## Runtime layout

Source code stays in the repo. Runtime artifacts now live under `runtime/` and are ignored by git:

- `runtime/daily_vibes/`: generated JSON and WAV files
- `runtime/logs/`: pipeline and model logs
- `runtime/latest.json`: pointer to the most recent generated bundle

The repo no longer relies on `insight_engine/output` or `insight_engine/logs` as the primary runtime location.

## Environment

Copy `.env.example` to `.env` and fill in the required values.

Key variables:

- `HOST`, `PORT`
- `TRADEVIBE_RUNTIME_DIR`
- `TRADEVIBE_TIMEZONE`
- `QWEN_API_URL`, `GEMMA_API_URL`, `TIFA_API_URL`, `TIFA_MODEL`
- `YOUTUBE_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_SECRET`
- `PIPER_BIN`, `PIPER_MODEL`

## Commands

```bash
npm ci
npm run lint
npm run build
npm run start
```

For local development:

```bash
npm run dev
```

## Deploy

### Web app

The repo ships with:

- `start.sh`: runtime-safe web entrypoint
- `ops/pm2/ecosystem.config.cjs`: PM2 config tracked in git
- `ops/systemd/tradevibe-web.service`: systemd service template for the web app

### Insight pipeline

The repo ships with:

- `insight_engine/tradevibe_runner.sh`: daily pipeline entrypoint
- `ops/systemd/tradevibe-insight.service`: oneshot service template
- `ops/systemd/tradevibe-insight.timer`: daily timer template

Important: only enable the timer, not the oneshot service itself. Enabling both causes duplicate daily generations.

## Operational notes

- `scripts/prepare-runtime.sh` creates the runtime directories and copies over any legacy files from `insight_engine/output` and `insight_engine/logs` on first run.
- `/api/today` now reads generated WAV files directly instead of re-running Piper on every page load.
- The canonical "latest bundle" is `runtime/latest.json`.

## Verification

After deploy, verify:

```bash
npm run check
curl http://127.0.0.1:3100/api/today
systemctl status tradevibe-insight.timer
```
