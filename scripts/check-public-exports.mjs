#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const tmpDir = path.join(rootDir, ".tmp", "public-exports");
const checkFile = path.join(tmpDir, "check-public-exports.ts");
const tsconfigFile = path.join(tmpDir, "tsconfig.json");

mkdirSync(tmpDir, { recursive: true });

writeFileSync(
  checkFile,
  `
import {
  TIFA_FRAMEWORK_MODULES,
  createLocalAssistantConfig,
} from "../../lib/tifa-core";

import {
  createTenantContext,
} from "../../lib/tifa-runtime";

import {
  TIFA_PROVIDER_CATALOG,
  createLocalFirstProviderGateway,
} from "../../lib/tifa-provider-gateway";

import {
  TIFA_VOICE_PROVIDER_CATALOG,
  createDefaultVoiceProviderRegistry,
} from "../../lib/tifa-voice";

import {
  validateReadOnlySql,
  createQueryPlan,
  validateQueryPlanSql,
} from "../../lib/tifa-data-connectors";

import {
  streamTifaReply,
  useTifaChat,
  useTifaVoice,
  type TifaWidgetExtensionPoints,
} from "../../lib/tifa-widget";

const assistantConfig = createLocalAssistantConfig();
const tenantContext = createTenantContext();
const gateway = createLocalFirstProviderGateway();
const voiceRegistry = createDefaultVoiceProviderRegistry();
const sqlValidation = validateReadOnlySql("SELECT symbol FROM v_market_bars LIMIT 1", {
  allowedViews: ["v_market_bars"],
  maxRows: 1,
});
const queryPlan = createQueryPlan({
  question: "Show EUR/USD price snapshot",
  context: { tenantId: "local" },
  maxRows: 1,
});
const planValidation = validateQueryPlanSql(queryPlan, { maxRows: 1, tenantId: "local" });

const extensionPoints: TifaWidgetExtensionPoints = {};

void [
  TIFA_FRAMEWORK_MODULES,
  assistantConfig,
  tenantContext,
  gateway,
  TIFA_PROVIDER_CATALOG,
  TIFA_VOICE_PROVIDER_CATALOG,
  voiceRegistry,
  sqlValidation,
  queryPlan,
  planValidation,
  streamTifaReply,
  useTifaChat,
  useTifaVoice,
  extensionPoints,
];
`,
  "utf-8"
);

writeFileSync(
  tsconfigFile,
  JSON.stringify(
    {
      extends: "../../tsconfig.json",
      compilerOptions: {
        noEmit: true,
        incremental: false,
        tsBuildInfoFile: "./.tsbuildinfo"
      },
      include: ["./check-public-exports.ts"],
    },
    null,
    2
  ),
  "utf-8"
);

try {
  execFileSync("npx", ["tsc", "-p", tsconfigFile, "--pretty", "false"], {
    cwd: rootDir,
    stdio: "inherit",
  });
  console.log("Public barrel export check passed.");
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
