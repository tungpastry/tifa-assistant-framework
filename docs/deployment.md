# Deployment

Tifa Assistant Framework supports a local-first single-node deployment.

## Install

```bash
cd /home/nexus/projects
git clone git@github.com:tungpastry/tifa-assistant-framework.git
cd tifa-assistant-framework
cp .env.example .env
npm install
npm run build
```

## Runtime

```bash
bash scripts/prepare-runtime.sh
```

## Web App

```bash
PORT=3100 npm run start
```

## TTS Worker

```bash
npm run tts:worker
```

## Systemd

Templates:

- `ops/systemd/tifa-assistant-web.service`
- `ops/systemd/tifa-assistant-tts-worker.service`

See `docs/LOCAL_PRODUCTION_SERVICES.md`.

## Validation

```bash
git diff --check
npm run lint
npm run build
npm run smoke:api
node --check scripts/tts-worker.mjs
npm run tts:worker:once
```

## SaaS Mode

Keep these disabled for local mode:

```env
TIFA_SAAS_MODE=0
TIFA_PG_ENABLED=0
TIFA_REDIS_ENABLED=0
TIFA_OBJECT_STORAGE_ENABLED=0
```
