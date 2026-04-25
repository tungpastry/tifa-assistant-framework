# Troubleshooting

## Next.js App won't start
*   **Error:** Missing `runtime/` directory.
*   **Fix:** Run `npm run dev` or `bash scripts/prepare-runtime.sh` to initialize the directory structure.

## No audio playing for the daily vibe
*   **Cause:** The Python pipeline hasn't run yet, or Piper failed to generate the WAV file.
*   **Fix:** Manually trigger the pipeline: `bash insight_engine/tradevibe_runner.sh`. Check logs in `runtime/logs/`.

## Chat Tifa is unresponsive
*   **Cause:** Ollama service is down or the model is not pulled.
*   **Fix:** Ensure Ollama is running (`systemctl status ollama`) and the required model is pulled (`ollama pull qwen2.5`).
