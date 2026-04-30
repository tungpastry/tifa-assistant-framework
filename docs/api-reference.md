# API Reference

This document covers the stable local API surface for Tifa Assistant Framework.

## Error Envelope

Most API errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Client-safe message.",
    "request_id": "uuid",
    "retryable": false,
    "details": {}
  }
}
```

## Chat

### `POST /api/tifa`

Non-streaming assistant reply.

Request:

```json
{
  "message": "Hello Tifa",
  "mood": "focused"
}
```

Response:

```json
{
  "reply": "Hello.",
  "model": "gemma3:1b"
}
```

### `POST /api/tifa/stream`

SSE streaming assistant reply.

Events:

- `start`
- `delta`
- `done`
- `error`

## Voice Jobs

### `POST /api/voice/jobs`

Creates a cache-first voice job.

Request:

```json
{
  "text": "Hello",
  "voice": "tifa-default",
  "format": "wav"
}
```

Response status can be `200` for cache hits or `202` for queued jobs.

### `GET /api/voice/jobs/{jobId}`

Returns job status:

- `queued`
- `processing`
- `ready`
- `failed`

### `GET /api/voice/jobs/{jobId}/audio`

Returns generated `audio/wav` when the job is ready.

## Health

### `GET /api/health`

Returns:

- local runtime directory status
- Ollama-compatible endpoint status
- Piper-compatible provider status
- TTS worker heartbeat and queue stats
- optional PostgreSQL/Redis/object storage/provider gateway/Text-to-SQL status

Disabled optional SaaS checks do not fail local readiness.
