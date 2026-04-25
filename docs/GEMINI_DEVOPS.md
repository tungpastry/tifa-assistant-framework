# Gemini CLI DevOps Guide — TradeVibe

## Entrypoint

Run from repo root:

    ./bin/tvgcli.sh "inspect repo and summarize current architecture"

## Optional alias

    mkdir -p ~/.local/bin
    ln -sf ~/projects/tradevibe-org/bin/tvgcli.sh ~/.local/bin/tvgcli

Then use:

    tvgcli "inspect package.json, Next.js API routes, and insight_engine runner"

## Boundary

Gemini CLI is used for development and DevOps only.

It must not:

- act as Tifa
- generate fake runtime logs
- generate fake playlist or vibe output
- read secrets
- modify generated output unless explicitly requested

## Workflow

1. Inspect
2. Plan
3. Implement
4. Harden
5. Close

## Useful validation commands

    npm run build
    npm run lint
    bash -n insight_engine/tradevibe_runner.sh
    python3 -m py_compile insight_engine/insight_engine_v3.py insight_engine/music_recommender_v3.py
    git diff --check
