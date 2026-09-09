# Piper Local Voice

Tifa uses standard Piper TTS through async voice jobs and a filesystem audio cache. Piper is the only bundled and supported voice provider. The provider interface remains stable so the runtime, healthcheck, and client discovery API share one contract.

## Current Local Voice Runtime

| Area | Current behavior |
| --- | --- |
| Provider | Piper |
| Binary | `PIPER_BIN` |
| Model | `PIPER_MODEL` |
| Cache | `runtime/audio_cache/` |
| Jobs | `runtime/tts_jobs/` |
| Worker | `scripts/tts-worker.mjs` |
| Legacy endpoint | `/api/voice?text=...` |
| Job endpoint | `/api/voice/jobs` |

Existing semantics:

- Create a voice job.
- Return cached audio immediately when available.
- Queue job when cache is missing.
- Worker generates WAV output.
- Client polls until ready.
- Client falls back to the legacy endpoint when job playback fails.

## Provider Interface

Providers should expose:

- `synthesizeToFile(input)`
- `health()`
- `getVoices()`
- `estimateLatency(input)` optional
- `supportsStreaming`
- `supportsVoiceCloning`
- `licenseClass`

The Piper provider boundary lives under:

```text
lib/voice/types.ts
lib/voice/provider-registry.ts
lib/voice/providers/piper.ts
```

## Piper Provider

Piper is the only local-first provider. Existing environment variables must keep working:

```env
PIPER_BIN=/home/nexus/piper-env/bin/piper
PIPER_MODEL=/home/nexus/piper/voices/en_US-libritts-high.onnx
PIPER_TIMEOUT_MS=10000
```

Voice job requests may omit `voice` or send `tifa-default`. Other voice IDs are rejected with a validation error.

## SaaS Audio Storage

In SaaS mode, generated voice assets should move to object storage with:

- Tenant-aware metadata.
- Signed URL access.
- Lifecycle retention policies.
- Usage events for generated seconds/characters.
- Audit events for provider failures and policy rejections.
