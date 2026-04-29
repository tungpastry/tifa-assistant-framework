import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { isValidSessionId, readChatSession } from "@/lib/chat-history";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!isValidSessionId(sessionId)) {
      return jsonError("VALIDATION_ERROR", "Invalid chat session ID.", 400);
    }

    const session = await readChatSession(sessionId);
    if (!session) {
      return jsonError("VALIDATION_ERROR", "Chat session not found.", 404);
    }

    return NextResponse.json(session);
  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
