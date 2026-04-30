# Tifa Operations SOP

This SOP covers the current Tifa local-first runtime and the SaaS-readiness scaffolds added for Tifa Assistant Framework.

## Local Health

Check:

```bash
curl -s http://127.0.0.1:3100/api/health
```

Health categories:

- `runtime`: required local directories.
- `ollama`: required local model endpoint for current Tifa chat.
- `piper`: required local voice provider for current Tifa voice.
- `postgres`: optional SaaS connector scaffold.
- `redis`: optional SaaS cache/rate-limit/queue placeholder.
- `provider_gateway`: optional LLM gateway scaffold.
- `text_to_sql`: optional guarded Text-to-SQL scaffold.

Optional SaaS services should report `disabled` when not configured and must not fail local readiness.

## Validation Commands

```bash
git diff --check
npm run lint
npm run build
npm run smoke:api
bash -n scripts/prepare-runtime.sh
bash -n scripts/cleanup-runtime.sh
node --check scripts/tts-worker.mjs
npm run tts:worker:once
```

Run live smoke only when the local stack is available:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:api
```

## Runtime Cleanup

Dry-run cleanup is the default:

```bash
npm run cleanup:runtime
```

Actual deletion requires:

```bash
TIFA_CLEANUP_DRY_RUN=0 npm run cleanup:runtime
```

Cleanup is scoped to runtime audio cache, TTS jobs, and logs.

## Incident Triage

1. Check `/api/health`.
2. Check app logs and runtime logs.
3. Verify Ollama availability and configured model.
4. Verify Piper binary/model paths.
5. Run validation commands.
6. For SaaS mode, inspect PostgreSQL, Redis, object storage, provider gateway, usage events, and audit events.

