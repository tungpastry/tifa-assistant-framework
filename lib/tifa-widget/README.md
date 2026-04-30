# tifa-widget

Frontend widget boundary for TifaWidget and future reusable React widget work:

- client event contracts
- widget props
- reusable React hooks for chat/session orchestration
- reusable React hooks for voice playback orchestration
- future package extraction

The current reference UI remains `components/TifaWidget.tsx`; this module owns
the reusable client behavior while the component stays mostly presentational.

## Public Import

```tsx
import {
  streamTifaReply,
  useTifaChat,
  useTifaVoice,
  type TifaWidgetConfig,
  type TifaWidgetExtensionPoints,
} from "@/lib/tifa-widget";
```

## Owns

- Browser API client helpers for chat, streaming, voice jobs, and sessions.
- React hooks for chat orchestration and voice playback.
- Widget config/types and extension-point contracts.
- Frontend-safe event types.

## Does Not Own

- Server route handlers.
- Runtime persistence implementations.
- Provider SDK calls.
- Voice synthesis.

## Extraction Notes

The reference UI stays in `components/TifaWidget.tsx`. Consuming repositories
should first reuse hooks/client helpers, then layer their own presentational UI
or extension renderers over the same contracts.
