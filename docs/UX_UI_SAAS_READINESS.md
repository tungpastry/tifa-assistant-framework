# UX/UI SaaS Readiness

ChatTifa remains the reference widget for TradeVibe. This plan documents SaaS-ready UX concepts without redesigning the current floating assistant.

## Preserve Current ChatTifa Behavior

Keep:

- Floating launcher placement.
- Minimize and expand.
- Mood avatar pattern: `/tifa_<mood>.png`.
- Streaming-first responses.
- Non-streaming fallback.
- Typing indicator.
- Auto-scroll.
- Auto voice greeting.
- Auto voice reply.
- Local persistent chat sessions.

## Future Widget Extension Points

Future `tifa-widget-react` work should prepare extension points for:

- Provider/model badge.
- Tool trace panel.
- Citation/evidence chips.
- SQL preview panel for guarded Text-to-SQL.
- Voice selector.
- Tenant/assistant selector.
- Quota/budget badge.
- Session folders.
- Accessibility settings.
- Mobile bottom-sheet mode.
- Reduced motion support.

## Design Guardrails

- Do not make `components/ChatTifa.tsx` larger as the long-term strategy.
- Extract client hooks and UI primitives only when stable.
- Keep dense operational controls out of the default compact widget.
- Prefer progressive disclosure for tool traces, citations, and SQL previews.
- Treat SQL preview as a review surface, not a raw execution box.
- Keep quota and budget states visible but calm.
- Preserve local-first mode with no tenant selector when no tenant context exists.

## Accessibility Checklist

Future implementation should verify:

- Keyboard access for launcher, minimize, send, voice toggle, and panels.
- Focus management when panels open and close.
- Screen reader labels for icon buttons.
- Reduced-motion behavior for animations and typing effects.
- Sufficient contrast for all mood backgrounds.
- Touch target sizing on mobile.

## SaaS UX States

Target SaaS states should include:

- Provider unavailable with fallback attempt.
- Rate limited with retry time.
- Budget limited with admin contact or upgrade route.
- Tool call pending, completed, failed, and rejected.
- Text-to-SQL rejected with safe reason.
- Citation unavailable.
- Voice provider disabled or unavailable.

## Repository-Specific UX Notes

| Repository | UX focus |
| --- | --- |
| TradeVibe | Reference local-first floating assistant |
| Fx-Sentinel | Financial evidence, SQL preview, news citations |
| nexus-trade-radar | Market dashboard signals and realtime trace |
| ZenoraAI | Persona and 2D assistant expression hooks |
| nexuscrypto | Crypto symbols, exchange context, connector evidence |

