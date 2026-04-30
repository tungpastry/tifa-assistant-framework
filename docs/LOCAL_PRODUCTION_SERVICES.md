# Local Production Services

Tifa Assistant Framework keeps TradeVibe local mode runnable without PostgreSQL, Redis, object storage, auth, or SaaS services. For a single Ubuntu server, run the web app and local filesystem TTS worker as separate services.

## Systemd Templates

Templates live in:

```text
ops/systemd/tifa-assistant-web.service
ops/systemd/tifa-assistant-tts-worker.service
```

They use placeholders so the same files can be adapted per host:

| Placeholder | Example |
| --- | --- |
| `${TIFA_SERVICE_USER}` | `nexus` |
| `${TIFA_REPO_ROOT}` | `/home/nexus/projects/tifa-assistant-framework` |

Install example:

```bash
cd /home/nexus/projects/tifa-assistant-framework

sudo install -m 0644 \
  <(sed \
    -e 's|${TIFA_SERVICE_USER}|nexus|g' \
    -e 's|${TIFA_REPO_ROOT}|/home/nexus/projects/tifa-assistant-framework|g' \
    ops/systemd/tifa-assistant-web.service) \
  /etc/systemd/system/tifa-assistant-web.service

sudo install -m 0644 \
  <(sed \
    -e 's|${TIFA_SERVICE_USER}|nexus|g' \
    -e 's|${TIFA_REPO_ROOT}|/home/nexus/projects/tifa-assistant-framework|g' \
    ops/systemd/tifa-assistant-tts-worker.service) \
  /etc/systemd/system/tifa-assistant-tts-worker.service

sudo systemctl daemon-reload
sudo systemctl enable --now tifa-assistant-web
sudo systemctl enable --now tifa-assistant-tts-worker
```

## TTS Worker Heartbeat

`scripts/tts-worker.mjs` writes:

```text
runtime/tts_worker_heartbeat.json
```

The heartbeat includes:

- `status`
- `pid`
- `updated_at`
- `processed_last_tick`
- `queue_depth`
- `runtime_dir`
- `audio_cache_dir`
- `tts_jobs_dir`

Heartbeat write failures are warnings only. The worker should keep running even if the heartbeat cannot be written.

## Health Behavior

`GET /api/health` reports `checks.tts_worker` with heartbeat age and queue stats. A missing worker heartbeat does not fail local mode when there are no queued or processing jobs. If queued/processing jobs exist and the heartbeat is missing or stale, the worker check becomes `degraded`.

