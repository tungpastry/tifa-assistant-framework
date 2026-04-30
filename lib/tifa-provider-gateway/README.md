# tifa-provider-gateway

Provider gateway boundary for LLM providers and routing policy:

- normalized provider interface
- local-first/cloud-first/cost-aware/privacy-first policies
- Ollama-compatible provider
- placeholder provider scaffolds for OpenAI, Gemini, and Qwen

The current TradeVibe routes still use the existing `TIFA_API_URL` path directly. This module is safe to adopt gradually.

