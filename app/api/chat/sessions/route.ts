import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { createChatSession } from "@/lib/chat-history";

async function readOptionalJson(req: Request) {
  const rawBody = await req.text();
  if (!rawBody.trim()) return {};

  try {
    const parsed = JSON.parse(rawBody);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await readOptionalJson(req);
    if (body === null) {
      return jsonError("VALIDATION_ERROR", "Invalid JSON in request body.", 400);
    }

    const session = await createChatSession({
      title: typeof body.title === "string" ? body.title : undefined,
      mood: typeof body.mood === "string" ? body.mood : undefined,
    });

    return NextResponse.json(session);
  } catch (err: unknown) {
    return jsonError("INTERNAL_ERROR", "An unexpected server error occurred.", 500, {
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
