# tifa-voice

Voice boundary for local-first TTS and future SaaS voice assets:

- provider contracts
- Piper, viPiper, and VieNeu provider scaffolds
- cache/job helpers
- local worker heartbeat/status

Tifa remains Piper-first by default. viPiper and VieNeu are opt-in scaffolds.

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
- Piper, viPiper, and VieNeu facade provider boundaries.
- Local voice job/cache helpers.
- Worker heartbeat/status contracts.
- Voice provider catalog metadata.

## Does Not Own

- Browser playback UI.
- Cloud object storage credentials.
- Heavy VieNeu model runtime.
- Redis/BullMQ production queue wiring.

## Extraction Notes

Keep the local filesystem queue as the default package adapter. Future SaaS
queue/object-storage adapters should be opt-in and should preserve the current
job status contract used by `/api/voice/jobs`.
