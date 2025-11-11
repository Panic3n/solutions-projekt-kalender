export type HaloAuth = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

let tokenCache: { token: string; exp: number } | null = null;

async function getHaloToken(): Promise<string> {
  const resourceBase = process.env.NEXT_PUBLIC_HALO_BASE_URL || process.env.HALO_BASE_URL;
  // Allow separate Authorization Server base
  const authBase = process.env.HALO_AUTH_BASE_URL || resourceBase;
  const tokenPath = (process.env.HALO_AUTH_TOKEN_PATH || "auth/token").replace(/^\//, "");
  const clientId = process.env.HALO_CLIENT_ID;
  const clientSecret = process.env.HALO_CLIENT_SECRET;
  const scope = process.env.HALO_SCOPE || "all";
  const tenant = process.env.HALO_TENANT; // optional
  if (!resourceBase || !authBase || !clientId || !clientSecret) throw new Error("HaloPSA env not configured");

  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp > now + 30) {
    return tokenCache.token;
  }
  const params = new URLSearchParams();
  params.set("grant_type", "client_credentials");
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  if (scope) params.set("scope", scope);
  if (tenant) params.set("tenant", tenant);
  const res = await fetch(`${authBase.replace(/\/$/, "")}/${tokenPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HaloPSA auth failed: ${res.status} ${txt}`);
  }
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
  const path = (process.env.HALO_CONSULTANTS_PATH || "Agent").replace(/^\//, "");
  const team = process.env.HALO_CONSULTANTS_TEAM || "Consultants";
  const idField = process.env.HALO_CONSULTANT_ID_FIELD || "id";
  const nameField = process.env.HALO_CONSULTANT_NAME_FIELD || "name";
  const qp = new URLSearchParams({ team, includeenabled: "true", includedisabled: "false", basic_fields_only: "true" });
  const raw = await haloFetch<any>(`${path}?${qp.toString()}`);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.agents)
      ? raw.agents
      : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
  return list.map((r: any) => ({ id: String(r?.[idField]), name: String(r?.[nameField] ?? "") }));
}

export async function fetchProjects(): Promise<HaloProject[]> {
  const path = (process.env.HALO_PROJECTS_PATH || "Projects").replace(/^\//, "");
  const idF = process.env.HALO_PROJECT_ID_FIELD || "id";
  const customerF = process.env.HALO_PROJECT_CUSTOMER_FIELD || "client_name";
  const nameF = process.env.HALO_PROJECT_NAME_FIELD || "summary";
  const typeF = process.env.HALO_PROJECT_TYPE_FIELD || "tickettype_name";
  const budgetF = process.env.HALO_PROJECT_BUDGET_FIELD || "projecttimebudget"; // fallback to estimate
  const startF = process.env.HALO_PROJECT_START_FIELD || "projectearlieststart";
  const endF = process.env.HALO_PROJECT_END_FIELD || "projectlatestend";
  const vScooped = (process.env.HALO_PROJECT_TYPE_SCOOPED || "scooped").toLowerCase();
  const vRetainer = (process.env.HALO_PROJECT_TYPE_RETAINER || "retainer").toLowerCase();
  const vRequest = (process.env.HALO_PROJECT_TYPE_REQUEST || "request").toLowerCase();
  const qp = new URLSearchParams({ domain: "prjs", default_columns: "true", includetickettype: "true", startandendset: "true" });
  const raw = await haloFetch<any>(`${path}?${qp.toString()}`);
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.tickets)
      ? raw.tickets
      : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
  return rows.map((r: any) => {
    const rawType = String(r?.[typeF] ?? "").toLowerCase();
    let type: "scooped" | "retainer" | "request";
    if (rawType === vScooped) type = "scooped";
    else if (rawType === vRetainer) type = "retainer";
    else if (rawType === vRequest) type = "request";
    else {
      const hasDates = !!r?.[startF] && !!r?.[endF];
      type = hasDates ? "scooped" : "request";
    }
    return {
      id: String(r?.[idF]),
      customer: r?.[customerF] != null ? String(r?.[customerF]) : undefined,
      name: String(r?.[nameF] ?? ""),
      type,
      budget_hours: Number(r?.[budgetF] ?? r?.estimate ?? 0),
      start_date: r?.[startF] ?? r?.startdate ?? null,
      end_date: r?.[endF] ?? r?.enddate ?? null,
    } as HaloProject;
  });
}
