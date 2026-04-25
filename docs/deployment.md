# Deployment Guide

TradeVibe is designed to be self-hosted on a machine capable of running local LLMs.

## Prerequisites for Production
*   Linux server (Ubuntu/Debian recommended).
*   Node.js 18+ and Python 3.10+.
*   PM2 (`npm install -g pm2`).
*   Ollama running locally.
*   Piper TTS binary available.

## Next.js Web App (PM2)
We provide an ecosystem file for PM2.
```bash
npm run build
pm2 start ops/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

## Insight Pipeline (Systemd)
The Python pipeline runs as a daily cron job using systemd timers.
1.  Copy the service and timer files to systemd:
    ```bash
    sudo cp ops/systemd/tradevibe-insight.* /etc/systemd/system/
    ```
2.  Enable the timer (DO NOT enable the service directly to avoid duplicate runs):
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable --now tradevibe-insight.timer
    ```
