# tifa-voice

Voice boundary for local-first TTS and future SaaS voice assets:

- provider contracts
- standard Piper local provider
- cache/job helpers
- local worker heartbeat/status

Tifa uses standard Piper as its only bundled local voice provider.

## Public Import

```ts
import {
  TIFA_VOICE_PROVIDER_CATALOG,
  createDefaultVoiceProviderRegistry,
  createVoiceJob,
  getTtsWorkerStatus,
  type VoiceProvider,
  type VoiceProviderConfig,
} from "@/lib/tifa-voice";
```

## Owns

- Voice provider contracts and provider registry.
- Standard Piper local provider boundary.
- Local voice job/cache helpers.
- Worker heartbeat/status contracts.
- Voice provider catalog metadata.

## Does Not Own

- Browser playback UI.
- Cloud object storage credentials.
- Heavy model runtime inside the Next.js process.
- Redis/BullMQ production queue wiring.

## Extraction Notes

Keep the local filesystem queue as the default package adapter. Future SaaS
queue/object-storage adapters should be opt-in and should preserve the current
job status contract used by `/api/voice/jobs`.
