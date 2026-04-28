# Troubleshooting

## Next.js App won't start
*   **Error:** Missing `runtime/` directory.
*   **Fix:** Run `npm run dev` or `bash scripts/prepare-runtime.sh` to initialize the directory structure.

## No audio playing for the daily vibe
*   **Cause:** The Python pipeline hasn't run yet, or Piper failed to generate the WAV file.
*   **Fix:** Manually trigger the pipeline: `bash insight_engine/tradevibe_runner.sh`. Check logs in `runtime/logs/`.

## Chat Tifa is unresponsive or times out
*   **Cause 1:** Ollama service is down or the model is not pulled.
    *   **Fix:** Ensure Ollama is running (`systemctl status ollama`) and the required model is available.
*   **Cause 2:** The request to the AI model is taking too long and timing out.
    *   **Fix:** You can increase the timeout by setting `TIFA_TIMEOUT_MS` in your `.env` file (e.g., `TIFA_TIMEOUT_MS=30000` for 30 seconds).

## Voice generation fails or times out
*   **Cause:** The Piper TTS process is failing or taking too long.
*   **Fix:** Check that the `PIPER_BIN` path in your `.env` file is correct. You can increase the timeout by setting `PIPER_TIMEOUT_MS` (e.g., `PIPER_TIMEOUT_MS=15000` for 15 seconds).
