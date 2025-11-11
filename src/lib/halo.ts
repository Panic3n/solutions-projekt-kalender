export type HaloAuth = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

let tokenCache: { token: string; exp: number } | null = null;

async function getHaloToken(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_HALO_BASE_URL || process.env.HALO_BASE_URL;
  const clientId = process.env.HALO_CLIENT_ID;
  const clientSecret = process.env.HALO_CLIENT_SECRET;
  const scope = process.env.HALO_SCOPE || "all";
  if (!base || !clientId || !clientSecret) throw new Error("HaloPSA env not configured");

  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp > now + 30) {
    return tokenCache.token;
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HaloPSA auth failed: ${res.status}`);
  const data = (await res.json()) as HaloAuth;
  tokenCache = { token: data.access_token, exp: now + Math.max(60, data.expires_in || 3600) };
  return tokenCache.token;
}

export async function haloFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_HALO_BASE_URL || process.env.HALO_BASE_URL;
  if (!base) throw new Error("HALO_BASE_URL missing");
  const token = await getHaloToken();
  const url = `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HaloPSA fetch failed: ${res.status}`);
  return (await res.json()) as T;
}

// Domain helpers (to be wired to actual HaloPSA endpoints)
export type HaloConsultant = { id: string; name: string };
export type HaloProject = {
  id: string;
  customer?: string;
  name: string;
  budget_hours?: number;
  start_date?: string | null;
  end_date?: string | null;
};

export async function fetchConsultants(): Promise<HaloConsultant[]> {
  // TODO: replace with real HaloPSA team endpoint for "Consultants" team
  // return await haloFetch("api/Consultants");
  return [];
}

export async function fetchProjects(): Promise<HaloProject[]> {
  // TODO: replace with real HaloPSA projects endpoint including start/stop/budget
  // return await haloFetch("api/Projects?fields=...&status=active");
  return [];
}
