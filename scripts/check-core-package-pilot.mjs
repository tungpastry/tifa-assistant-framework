#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const packageDir = path.join(rootDir, "packages", "core");
const tmpDir = path.join(rootDir, ".tmp", "core-package-consumer");
const consumerFile = path.join(tmpDir, "consumer.ts");
const tsconfigFile = path.join(tmpDir, "tsconfig.json");

function fail(message) {
  console.error(`Core package pilot check failed: ${message}`);
  process.exit(1);
}

function run(command, args, cwd = rootDir) {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

run("npm", ["run", "build", "-w", "@tifa-assistant/core"]);

const jsPath = path.join(packageDir, "dist", "packages", "core", "src", "index.js");
const dtsPath = path.join(packageDir, "dist", "packages", "core", "src", "index.d.ts");

if (!fs.existsSync(jsPath)) fail(`missing built JavaScript: ${path.relative(rootDir, jsPath)}`);
if (!fs.existsSync(dtsPath)) fail(`missing declarations: ${path.relative(rootDir, dtsPath)}`);

mkdirSync(tmpDir, { recursive: true });

writeFileSync(
  consumerFile,
  `
import {
  TIFA_FRAMEWORK_MODULES,
  createLocalAssistantConfig,
} from "@tifa-assistant/core";

const config = createLocalAssistantConfig();
const moduleCount: number = TIFA_FRAMEWORK_MODULES.length;
const assistantName: string = config.name;

void [moduleCount, assistantName];
`,
  "utf-8"
);

writeFileSync(
  tsconfigFile,
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        types: ["node"],
      },
      include: ["./consumer.ts"],
    },
    null,
    2
  ),
  "utf-8"
);

try {
  run("npx", ["tsc", "-p", tsconfigFile, "--pretty", "false"]);
  const imported = await import("@tifa-assistant/core");
  if (!Array.isArray(imported.TIFA_FRAMEWORK_MODULES)) {
    fail("runtime import did not expose TIFA_FRAMEWORK_MODULES.");
  }
  if (typeof imported.createLocalAssistantConfig !== "function") {
    fail("runtime import did not expose createLocalAssistantConfig.");
  }
  console.log("Core package consumer check passed.");
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
