# Architecture

TradeVibe follows a decoupled architecture designed for high performance and local AI execution.

## High-Level Design

The system is split into two independent parts:

1.  **Daily Pipeline (Python - Insight Engine):**
    *   Runs as a daily batch job (via `systemd` timers).
    *   Generates content using local AI (Ollama) and TTS (Piper).
    *   Fetches external data (YouTube/Spotify).
    *   Saves artifacts (JSON, WAV) to a git-ignored `runtime/` directory.

2.  **Frontend Web App (Next.js):**
    *   Serves the UI and API endpoints.
    *   Reads pre-generated artifacts from `runtime/` for ultra-fast page loads (no waiting for AI generation).
    *   Provides real-time interactive features (Chat Tifa) by proxying requests to local LLMs and TTS services.

## Directory Structure
*   `app/` & `components/`: Next.js frontend code.
*   `insight_engine/`: Python pipeline scripts.
*   `lib/`: Utilities for interacting with the `runtime/` data.
*   `runtime/`: The local "database" of generated files (not tracked in Git).
*   `ops/`: Deployment configurations.
