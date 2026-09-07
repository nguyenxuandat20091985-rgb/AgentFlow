const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseAdminConfigured() {
  return Boolean(url && key);
}

export async function supabaseAdmin<T = unknown>(path: string, init: RequestInit = {}) {
  if (!url || !key) throw new Error("Supabase server configuration is missing");
  const response = await fetch(`${url}/rest/v1/${path}`, {
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
