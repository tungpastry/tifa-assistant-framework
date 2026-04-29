import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { ensureRuntimeDirs, getChatSessionsDir } from "@/lib/runtime";

export type ChatMessageRole = "user" | "assistant" | "system";

export interface ChatSessionRecord {
  id: string;
  title?: string;
  mood?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  role: ChatMessageRole;
  content: string;
  mood?: string;
  voice_job_id?: string | null;
  model?: string | null;
  created_at: string;
}

export interface CreateChatSessionInput {
  title?: string;
  mood?: string;
}

export interface CreateChatMessageInput {
  role: ChatMessageRole;
  content: string;
  mood?: string;
  voice_job_id?: string | null;
  model?: string | null;
}

const SESSION_ID_PATTERN = /^session_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSessionId(sessionId: string) {
  return SESSION_ID_PATTERN.test(sessionId);
}

export function isValidMessageRole(role: string): role is ChatMessageRole {
  return role === "user" || role === "assistant" || role === "system";
}

function getSessionPath(sessionId: string) {
  return path.join(getChatSessionsDir(), `${sessionId}.json`);
}

function getMessagesPath(sessionId: string) {
  return path.join(getChatSessionsDir(), `${sessionId}.messages.jsonl`);
}

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function createChatSession(
  input: CreateChatSessionInput = {}
): Promise<ChatSessionRecord> {
  ensureRuntimeDirs();
  const now = new Date().toISOString();
  const session: ChatSessionRecord = {
    id: `session_${randomUUID()}`,
    ...(input.title?.trim() ? { title: input.title.trim() } : {}),
    ...(input.mood?.trim() ? { mood: input.mood.trim() } : {}),
    created_at: now,
    updated_at: now,
  };

  await writeJson(getSessionPath(session.id), session);
  await fs.writeFile(getMessagesPath(session.id), "", { flag: "a" });
  return session;
}

export async function readChatSession(
  sessionId: string
): Promise<ChatSessionRecord | null> {
  if (!isValidSessionId(sessionId)) return null;

  try {
    const data = await fs.readFile(getSessionPath(sessionId), "utf-8");
    return JSON.parse(data) as ChatSessionRecord;
  } catch {
    return null;
  }
}

export async function readChatMessages(
  sessionId: string
): Promise<ChatMessageRecord[] | null> {
  if (!isValidSessionId(sessionId)) return null;
  const session = await readChatSession(sessionId);
  if (!session) return null;

  try {
    const data = await fs.readFile(getMessagesPath(sessionId), "utf-8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ChatMessageRecord);
  } catch {
    return [];
  }
}

export async function appendChatMessage(
  sessionId: string,
  input: CreateChatMessageInput
): Promise<ChatMessageRecord | null> {
  ensureRuntimeDirs();
  const session = await readChatSession(sessionId);
  if (!session) return null;

  const now = new Date().toISOString();
  const message: ChatMessageRecord = {
    id: `msg_${randomUUID()}`,
    session_id: sessionId,
    role: input.role,
    content: input.content.trim(),
    ...(input.mood?.trim() ? { mood: input.mood.trim() } : {}),
    voice_job_id: input.voice_job_id ?? null,
    model: input.model ?? null,
    created_at: now,
  };

  await fs.appendFile(
    getMessagesPath(sessionId),
    `${JSON.stringify(message)}\n`,
    "utf-8"
  );

  session.updated_at = now;
  await writeJson(getSessionPath(sessionId), session);
  return message;
}
