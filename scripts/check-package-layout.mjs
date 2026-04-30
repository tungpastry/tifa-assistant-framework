#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const manifestPath = path.join(rootDir, "framework-packages.manifest.json");

function fail(message) {
  console.error(`Package layout check failed: ${message}`);
  process.exit(1);
}

function assertPathExists(relativePath, label) {
  if (!relativePath || !fs.existsSync(path.join(rootDir, relativePath))) {
    fail(`${label} does not exist: ${relativePath || "(missing)"}`);
  }
}

if (!fs.existsSync(manifestPath)) {
  fail("framework-packages.manifest.json is missing.");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
if (!Array.isArray(manifest.packages) || manifest.packages.length === 0) {
  fail("manifest.packages must be a non-empty array.");
}

const packageNames = new Set();
const sources = new Set();

for (const entry of manifest.packages) {
  if (!entry.name || typeof entry.name !== "string") {
    fail("package entry is missing name.");
  }
  if (!entry.name.startsWith("@tifa-assistant/")) {
    fail(`package name must start with @tifa-assistant/: ${entry.name}`);
  }
  if (packageNames.has(entry.name)) {
    fail(`duplicate package name: ${entry.name}`);
  }
  packageNames.add(entry.name);

  if (!entry.source || typeof entry.source !== "string") {
    fail(`${entry.name} is missing source.`);
  }
  if (sources.has(entry.source)) {
    fail(`duplicate package source: ${entry.source}`);
  }
  sources.add(entry.source);

  assertPathExists(entry.source, `${entry.name} source`);
  assertPathExists(entry.publicEntry, `${entry.name} public entry`);

  if (entry.status === "pilot-workspace") {
    assertPathExists(entry.packageDir, `${entry.name} packageDir`);
    assertPathExists(entry.packageEntry, `${entry.name} packageEntry`);
  }
}

console.log(`Package layout check passed for ${manifest.packages.length} package(s).`);
