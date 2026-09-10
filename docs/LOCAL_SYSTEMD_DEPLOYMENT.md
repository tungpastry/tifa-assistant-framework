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
- Node.js is `20.9.0` or newer (`22.18.0` is used by the provided service files)
- Dependencies were installed reproducibly with `npm ci`
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

## Mac Development Access

The web service binds to `0.0.0.0`. Keep Ubuntu firewall access scoped to the
development Mac instead of exposing port 3205 to the whole LAN:

```bash
sudo ufw allow from 192.168.1.7 to 192.168.1.30 port 3205 proto tcp \
  comment "Tifa web from Mac dev"
sudo ufw status numbered
```

Verify the route from the Mac:

```bash
curl -fsS http://192.168.1.30:3205/api/health
```

## Playwright Deployment Check

After `npm ci`, install the managed Chromium build and its Ubuntu libraries:

```bash
npm run playwright:install:ubuntu
```

Run the read-only production checks locally on Ubuntu:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3205 npm run test:e2e:deploy
```

Or run the same deployment gate from the authorized Mac:

```bash
PLAYWRIGHT_BASE_URL=http://192.168.1.30:3205 npm run test:e2e:deploy
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
