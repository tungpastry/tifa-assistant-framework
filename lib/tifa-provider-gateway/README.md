# tifa-provider-gateway

Provider gateway boundary for LLM providers and routing policy:

- normalized provider interface
- local-first/cloud-first/cost-aware/privacy-first policies
- Ollama-compatible provider
- live `generate()` adapters for OpenAI, Gemini, and Qwen

The current Tifa chat routes use this gateway while preserving the existing
`TIFA_API_URL` environment contract for local Ollama-compatible runtimes.

## Local Gateway

`createLocalFirstProviderGateway()` builds a local-first router with the Ollama-compatible provider. It preserves the current environment contract:

- `TIFA_API_URL`
- `TIFA_MODEL`
- `OLLAMA_URL`

Cloud providers are implemented for non-streaming generation and are not
required for local mode.
Cloud provider health reports `disabled` when keys are absent and `degraded`
when credentials are configured but no live health probe has been run.
