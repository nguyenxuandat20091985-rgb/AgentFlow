import { NextRequest, NextResponse } from "next/server";
import { validateFacebookPageToken } from "@/lib/facebook";

export const dynamic = "force-dynamic";

/**
 * Diagnostic authentication is canonicalized on Authorization: Bearer <secret>.
 * Keep the custom header as a backwards-compatible fallback for existing jobs.
 */
function authorized(request: NextRequest) {
  const expected = (process.env.AGENT_HEARTBEAT_SECRET || "").trim();
  if (!expected) return false;

  const authorization = (request.headers.get("authorization") || "").trim();
  const customSecret = (request.headers.get("x-agent-heartbeat-secret") || "").trim();

  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  return bearer === expected || customSecret === expected;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const token = await validateFacebookPageToken();

  // validateFacebookPageToken intentionally returns only safe diagnostic fields;
  // never return the actual Facebook access token to the browser.
  return NextResponse.json(
    {
      ok: true,
      agentId: "marketing",
      facebook: token,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
