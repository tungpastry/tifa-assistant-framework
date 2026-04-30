# tifa-widget

Frontend widget boundary for TifaWidget and future reusable React widget work:

- client event contracts
- widget props
- reusable React hooks for chat/session orchestration
- reusable React hooks for voice playback orchestration
- future package extraction

The current reference UI remains `components/TifaWidget.tsx`; this module owns
the reusable client behavior while the component stays mostly presentational.
