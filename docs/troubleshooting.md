# Troubleshooting

## Health

```bash
curl -s http://127.0.0.1:3100/api/health | jq
```

Check:

- `checks.runtime`
- `checks.ollama`
- `checks.piper`
- `checks.tts_worker`

## App Does Not Start

```bash
npm install
npm run build
PORT=3100 npm run start
```

## Chat Fails

Verify:

```bash
curl -s http://127.0.0.1:11434/api/tags | jq
grep '^TIFA_API_URL=' .env
grep '^TIFA_MODEL=' .env
```

## Voice Job Stays Queued

Run one worker pass:

```bash
npm run tts:worker:once
```

Check heartbeat:

```bash
cat runtime/tts_worker_heartbeat.json | jq
```

## Smoke Tests

```bash
npm run smoke:api
```

Use a custom app URL:

```bash
BASE_URL=http://127.0.0.1:3202 npm run smoke:api
```
