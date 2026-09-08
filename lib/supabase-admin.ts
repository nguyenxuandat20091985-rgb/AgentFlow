import { createClient } from "@supabase/supabase-js";

/** Server-only Supabase admin client. Never import this module from client components. */
function getConfig() {
  // SUPABASE_URL is the canonical server variable used by existing API routes.
  // NEXT_PUBLIC_SUPABASE_URL is accepted as a backwards-compatible fallback.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, key };
}

export function supabaseAdminConfigured() {
  const { url, key } = getConfig();
  return Boolean(url && key);
}

export function getSupabaseAdmin() {
  const { url, key } = getConfig();
  if (!url) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function supabaseAdmin<T = unknown>(path: string, init: RequestInit = {}) {
  const { url, key } = getConfig();
  if (!url) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${text}`);
  return text ? (JSON.parse(text) as T) : null;
}
