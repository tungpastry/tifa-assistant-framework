# P9 Core Package Publish

This document records the first npm publish flow for `@tifa-assistant/core`.

## Required Checks

- `npm run check`
- `npm pack --dry-run`
- `npm publish --dry-run`
- `npm whoami`
- npm scope access verified

## Package

`@tifa-assistant/core`

## Safety

Do not publish root app.
Do not publish runtime files.
Do not publish secrets.
