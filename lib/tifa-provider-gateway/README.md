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

## Public Import

```ts
import {
  TIFA_PROVIDER_CATALOG,
  createLocalFirstProviderGateway,
  createProviderGatewayProviders,
  type LLMProvider,
  type LLMRequest,
  type ProviderRoutingPolicy,
} from "@/lib/tifa-provider-gateway";
```

## Owns

- Normalized LLM provider interface.
- Ollama, OpenAI, Gemini, and Qwen provider adapters.
- Provider catalog and deployment metadata.
- Fallback order helpers for `local-first`, `cloud-first`, `cost-aware`, and
  `privacy-first` policies.

## Does Not Own

- Prompt files or persona authoring.
- Chat session persistence.
- Browser streaming client behavior.
- Provider secrets or tenant key storage.

## Extraction Notes

Consumers should start by importing the provider gateway instead of importing
`@/lib/llm/*` directly. Keep Ollama-compatible local mode as the default and
make every cloud provider explicitly configured by environment or future tenant
provider-key metadata.
