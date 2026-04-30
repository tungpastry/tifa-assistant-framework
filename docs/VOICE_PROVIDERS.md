# Voice Providers

Tifa currently uses local Piper TTS through async voice jobs and a filesystem audio cache. The Tifa voice layer should preserve that behavior while adding provider contracts for SaaS and multilingual deployments.

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

## Target Provider Interface

Providers should expose:

- `synthesizeToFile(input)`
- `health()`
- `getVoices()`
- `estimateLatency(input)` optional
- `supportsStreaming`
- `supportsVoiceCloning`
- `licenseClass`

The initial provider scaffold lives under:

```text
lib/voice/types.ts
lib/voice/provider-registry.ts
lib/voice/providers/piper.ts
lib/voice/providers/vipiper.ts
lib/voice/providers/vieneu.ts
```

## Piper Provider

Piper remains the default local-first provider. Existing environment variables must keep working:

```env
PIPER_BIN=/home/nexus/piper-env/bin/piper
PIPER_MODEL=/home/nexus/piper/voices/en_US-libritts-high.onnx
PIPER_TIMEOUT_MS=10000
```

## viPiper Provider

viPiper is planned as a Piper-compatible Vietnamese provider scaffold. It should support ONNX model paths and should not download models automatically.

Suggested env:

```env
TIFA_VIPIPER_ENABLED=0
TIFA_VIPIPER_BIN=/path/to/piper
TIFA_VIPIPER_MODEL=/path/to/vi_VN-model.onnx
```

## VieNeu-TTS Provider

VieNeu-TTS should be integrated through an HTTP facade service, not direct model loading inside Next.js.

Suggested env:

```env
TIFA_VIENEU_ENABLED=0
TIFA_VIENEU_BASE_URL=http://127.0.0.1:8089
TIFA_VIENEU_MODEL=pnnbao-ump/VieNeu-TTS-q4-gguf
TIFA_VIENEU_LICENSE_CLASS=apache-2.0
```

Production-safe default recommendation:

- Use the 0.5B Apache-2.0 model or 0.5B q4/q8 GGUF Apache-2.0 variants for SaaS/commercial mode.
- Do not default to 0.3B CC BY-NC models for commercial or SaaS mode.

See `docs/VIENEU_TTS_INTEGRATION.md` for the facade deployment guidance.

## SaaS Audio Storage

In SaaS mode, generated voice assets should move to object storage with:

- Tenant-aware metadata.
- Signed URL access.
- Lifecycle retention policies.
- Usage events for generated seconds/characters.
- Audit events for provider failures and policy rejections.
