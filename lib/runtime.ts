import fs from "fs";
import path from "path";

export const TIFA_TIMEZONE =
  process.env.TIFA_TIMEZONE || "Asia/Ho_Chi_Minh";

export function getRepoRoot() {
  return process.cwd();
}

export function resolveFromRepoRoot(targetPath: string) {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  return path.join(getRepoRoot(), targetPath);
}

export function getRuntimeDir() {
  return resolveFromRepoRoot(
    process.env.TIFA_RUNTIME_DIR || "runtime"
  );
}

export function getRuntimeLogsDir() {
  return path.join(getRuntimeDir(), "logs");
}

export function getAudioCacheDir() {
  return path.join(getRuntimeDir(), "audio_cache");
}

export function getTtsJobsDir() {
  return path.join(getRuntimeDir(), "tts_jobs");
}

export function getTtsWorkerHeartbeatPath() {
  return path.join(getRuntimeDir(), "tts_worker_heartbeat.json");
}

export function getChatSessionsDir() {
  return path.join(getRuntimeDir(), "chat_sessions");
}

export function ensureRuntimeDirs() {
  for (const dir of [
    getRuntimeDir(),
    getRuntimeLogsDir(),
    getAudioCacheDir(),
    getTtsJobsDir(),
    getChatSessionsDir(),
  ]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function getCurrentDate(timeZone = TIFA_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function extractDateFromName(name: string) {
  const match = name.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

export function listFilesByMtimeDesc(
  dir: string,
  predicate: (name: string) => boolean
) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter(predicate)
    .map((name) => {
      const fullPath = path.join(dir, name);
      return {
        name,
        fullPath,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
}

export function readJsonFile<T>(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function encodeAudioFile(filePath: string | null | undefined) {
  if (!filePath) {
    return null;
  }

  const resolvedPath = resolveFromRepoRoot(filePath);
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  return fs.readFileSync(resolvedPath).toString("base64");
}
