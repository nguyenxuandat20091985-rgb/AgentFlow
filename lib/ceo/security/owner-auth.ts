/**
 * Shared server-side auth for CEO/Factory mutating endpoints.
 * Matches existing heartbeat pattern: Bearer token or x-agent-heartbeat-secret.
 * GET/read endpoints remain open for cockpit (same as existing /api/ceo/cockpit).
 */
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** True when request presents the shared server secret. */
export function isOwnerAuthorized(request: Request | NextRequest): boolean {
  const expected = process.env.AGENT_HEARTBEAT_SECRET?.trim() || process.env.OWNER_API_SECRET?.trim() || "";
  if (!expected) {
    return false;
  }

  const legacy = (request.headers.get("x-agent-heartbeat-secret") || request.headers.get("x-owner-secret") || "").trim();
  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";

  return (legacy !== "" && safeEqual(legacy, expected)) || (bearer !== "" && safeEqual(bearer, expected));
}

export function unauthorizedResponse(message = "unauthorized") {
  return Response.json({ ok: false, error: message }, { status: 401 });
}

export function ownerAuthConfigured(): boolean {
  return Boolean(process.env.AGENT_HEARTBEAT_SECRET?.trim() || process.env.OWNER_API_SECRET?.trim());
}
