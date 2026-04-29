import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import {
  appendChatMessage,
  isValidMessageRole,
  isValidSessionId,
  readChatMessages,
} from "@/lib/chat-history";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!isValidSessionId(sessionId)) {
      return jsonError("VALIDATION_ERROR", "Invalid chat session ID.", 400);
    }

    const messages = await readChatMessages(sessionId);
    if (!messages) {
      return jsonError("VALIDATION_ERROR", "Chat session not found.", 404);
    }

    return NextResponse.json({ messages });
  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!isValidSessionId(sessionId)) {
      return jsonError("VALIDATION_ERROR", "Invalid chat session ID.", 400);
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      body = parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return jsonError("VALIDATION_ERROR", "Invalid JSON in request body.", 400);
    }

    const role = typeof body.role === "string" ? body.role : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!isValidMessageRole(role)) {
      return jsonError("VALIDATION_ERROR", "Invalid chat message role.", 400);
    }

    if (!content) {
      return jsonError("VALIDATION_ERROR", "Message content cannot be empty.", 400);
    }

    const message = await appendChatMessage(sessionId, {
      role,
      content,
      mood: typeof body.mood === "string" ? body.mood : undefined,
      voice_job_id:
        typeof body.voice_job_id === "string" ? body.voice_job_id : null,
      model: typeof body.model === "string" ? body.model : null,
    });

    if (!message) {
      return jsonError("VALIDATION_ERROR", "Chat session not found.", 404);
    }

    return NextResponse.json(message);
  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
