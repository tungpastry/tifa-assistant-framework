# @tifa-assistant/core

**Hey trader, how are you feeling today?**

Core contracts and framework metadata for Tifa Assistant Framework.

This is the first npm-publishable pilot package. The source of truth remains
`lib/tifa-core` in the framework repository; this workspace package re-exports
that boundary for package validation and publishing.

## Install

```bash
npm install @tifa-assistant/core
```

## Usage

```ts
import {
  TIFA_FRAMEWORK_MODULES,
  createLocalAssistantConfig,
  type AssistantConfig,
} from "@tifa-assistant/core";

const config: AssistantConfig = createLocalAssistantConfig();
console.log(config.name, TIFA_FRAMEWORK_MODULES.length);
```

## Safety

- No secrets are included.
- No runtime files are included.
- SaaS mode is not enabled by this package.
- PostgreSQL, Redis, object storage, auth, and cloud providers remain opt-in.
