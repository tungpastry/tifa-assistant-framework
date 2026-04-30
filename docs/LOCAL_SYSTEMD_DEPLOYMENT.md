# Local Systemd Deployment

These templates run Tifa Assistant Framework as two local Ubuntu Server
services:

- `tifa-web`: Next.js web/API process
- `tifa-tts-worker`: filesystem voice job worker

They keep local-first mode and do not require PostgreSQL, Redis, object storage,
auth, or SaaS mode.

## Assumptions

- Linux user: `nexus`
- Project path: `/home/nexus/projects/tifa-assistant-framework`
- Environment file: `/home/nexus/projects/tifa-assistant-framework/.env`
- Runtime directory is writable by `nexus`
- `npm run build` has completed before starting the web service

## Install Services

```bash
cd /home/nexus/projects/tifa-assistant-framework

sudo cp deploy/systemd/tifa-web.service /etc/systemd/system/tifa-web.service
sudo cp deploy/systemd/tifa-tts-worker.service /etc/systemd/system/tifa-tts-worker.service
sudo systemctl daemon-reload
```

## Enable And Start

```bash
sudo systemctl enable --now tifa-web
sudo systemctl enable --now tifa-tts-worker
```

## Check Status

```bash
sudo systemctl status tifa-web --no-pager
sudo systemctl status tifa-tts-worker --no-pager
```

## Read Logs

```bash
journalctl -u tifa-web -n 80 --no-pager
journalctl -u tifa-tts-worker -n 80 --no-pager
```

## Restart

```bash
sudo systemctl restart tifa-web
sudo systemctl restart tifa-tts-worker
```

## Healthcheck

```bash
curl -s http://127.0.0.1:3205/api/health | jq .
```

## Worker Heartbeat

```bash
cat /home/nexus/projects/tifa-assistant-framework/runtime/tts_worker_heartbeat.json | jq .
```

If the heartbeat is missing and the queue has pending jobs, `/api/health` should
report the worker as degraded rather than failing the entire local runtime.

## UbuntuServer Port Convention

- tradevibe-org uses port 3100.
- tifa-assistant-framework uses port 3205.
- tifa-web reads PORT from /home/nexus/projects/tifa-assistant-framework/.env.
- Tifa healthcheck: http://127.0.0.1:3205/api/health.
- Do not use port 3100 for Tifa on this server.

