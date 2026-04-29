# VieNeu-TTS Integration

VieNeu-TTS should be integrated through a separate HTTP facade service. The Next.js app should submit synthesis requests to that facade and receive audio bytes or object storage references. Heavy Python dependencies, model downloads, and GPU/CPU model execution should not run inside Next.js request handlers.

## Recommended Model Policy

For SaaS or commercial use, default to license-safe options:

- 0.5B Apache-2.0.
- 0.5B q4/q8 GGUF Apache-2.0 variants.

Do not default SaaS/commercial deployments to 0.3B CC BY-NC models.

## Environment

```env
TIFA_VIENEU_ENABLED=0
TIFA_VIENEU_BASE_URL=http://127.0.0.1:8089
TIFA_VIENEU_MODEL=pnnbao-ump/VieNeu-TTS-q4-gguf
TIFA_VIENEU_LICENSE_CLASS=apache-2.0
```

## Facade Responsibilities

The facade service should:

- Own model loading and dependency management.
- Expose `/health`.
- Expose `/synthesize`.
- Return WAV bytes or object storage references.
- Enforce request size limits.
- Emit provider-level metrics.
- Keep model license metadata visible.

## TradeVibe Runtime Compatibility

TradeVibe remains Piper-first by default. VieNeu is disabled unless `TIFA_VIENEU_ENABLED=1`, so unavailable VieNeu services must not fail local readiness or smoke tests.

