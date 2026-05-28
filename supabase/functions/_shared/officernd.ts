// Shared OfficeRnD v2 helper used by sync-officernd-charge,
// sync-officernd-charge-batch and test-officernd-connection.
//
// v1 -> v2 differences handled here:
//  - Base URL is /api/v2/organizations/<slug>/...
//  - List endpoints (/members, /plans, /fees) return { results, cursorNext, cursorPrev }
//    instead of a bare array.
//  - One-off items in OfficeRnD UI are "Plans" with billing.period = "OneOff".
//    In v2 these can be looked up via /fees OR /plans depending on configuration —
//    we try /fees first, fall back to /plans.
//  - POST /fees still creates a one-off charge with essentially the same body shape.
//
// Token scopes (already configured on the "Flexum Coworking Post" app):
//   flex.billing.charges.create, flex.billing.charges.read,
//   flex.billing.plans.read, flex.community.members.read

export interface OfficeRndConfig {
  clientId: string;
  clientSecret: string;
  orgSlug: string;
}

export interface OfficeRndMember {
  _id: string;
  team?: string | null;
  office?: string | null;
  email?: string;
  [k: string]: unknown;
}

type ItemSource = "fees" | "plans";

export interface OfficeRndItem {
  id: string;
  name: string;
  source: ItemSource;
  price?: number | null;
  raw: any;
}

const TOKEN_SCOPES = [
  "flex.billing.charges.create",
  "flex.billing.charges.read",
  "flex.billing.checkout.create",
  "flex.community.members.read",
  "flex.billing.plans.read",
].join(" ");

export function v2Base(orgSlug: string): string {
  return `https://app.officernd.com/api/v2/organizations/${orgSlug}`;
}

export async function getOfficeRndToken(cfg: OfficeRndConfig): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: TOKEN_SCOPES,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const res = await fetch("https://identity.officernd.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OfficeRnD auth failed [${res.status}]: ${txt}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

// v2 list endpoints return { results, cursorNext, cursorPrev } — normalize to array.
function extractList(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.results)) return json.results;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

export async function findMembersByEmail(
  apiBase: string,
  token: string,
  email: string
): Promise<OfficeRndMember[]> {
  const url = `${apiBase}/members?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Member lookup failed for ${email} [${res.status}]: ${txt}`);
  }
  const json = await res.json();
  return extractList(json) as OfficeRndMember[];
}

// In-memory cache per invocation. Keyed by name; never crosses runtimes.
const itemCache = new Map<string, OfficeRndItem | null>();

async function lookupInEndpoint(
  apiBase: string,
  token: string,
  endpoint: ItemSource,
  name: string
): Promise<OfficeRndItem | null> {
  const url = `${apiBase}/${endpoint}?name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    // 404 / 403 on one endpoint is fine — caller will try the other.
    const txt = await res.text();
    console.warn(`OfficeRnD /${endpoint}?name=${name} -> ${res.status}: ${txt}`);
    return null;
  }
  const json = await res.json();
  const list = extractList(json);
  // Prefer exact case-sensitive match, then case-insensitive.
  const exact = list.find((p: any) => p.name === name);
  const ci = exact ?? list.find((p: any) => typeof p.name === "string" && p.name.toLowerCase() === name.toLowerCase());
  if (!ci) return null;
  return {
    id: ci._id ?? ci.id,
    name: ci.name,
    source: endpoint,
    price: ci.price ?? null,
    raw: ci,
  };
}

export async function findItemByName(
  apiBase: string,
  token: string,
  name: string
): Promise<OfficeRndItem | null> {
  if (itemCache.has(name)) return itemCache.get(name)!;
  // Try /fees first (true one-offs); fall back to /plans (OfficeRnD treats
  // "One-off Plan" entries both ways depending on org configuration).
  let item = await lookupInEndpoint(apiBase, token, "fees", name);
  if (!item) item = await lookupInEndpoint(apiBase, token, "plans", name);
  itemCache.set(name, item);
  if (item) {
    console.log(`OfficeRnD item match: "${name}" -> ${item.source}/${item.id}`);
  } else {
    console.warn(`OfficeRnD item NOT FOUND: "${name}"`);
  }
  return item;
}

export interface CreateFeeInput {
  member?: string;
  team?: string | null;
  office?: string | null;
  isPersonal: boolean;
  price: number;
  quantity: number;
  name: string;
  description?: string;
  date?: string;
  /** Resolved item from findItemByName — drives plan/fee reference field. */
  item?: OfficeRndItem | null;
}

/**
 * Create a one-off fee in OfficeRnD v2 via POST /checkout.
 *
 * v2 FeeRequestDto only accepts { plan, date, location } — pricing is
 * determined entirely by the referenced plan (no per-line price override).
 * That means we MUST have a resolved item.id; without one we throw so the
 * caller logs a "plan not found" error instead of silently creating a free
 * checkout.
 *
 * Required scope: flex.billing.checkout.create (already on the app).
 */
export async function createFee(
  apiBase: string,
  token: string,
  input: CreateFeeInput
): Promise<{ id: string | null; planType: string; raw: any }> {
  if (!input.item?.id) {
    throw new Error(
      `OfficeRnD checkout requires a resolved plan id; none found for "${input.name}"`
    );
  }
  if (!input.member) {
    throw new Error(`OfficeRnD checkout requires a member id`);
  }

  const date = (input.date ?? new Date().toISOString()).slice(0, 10); // YYYY-MM-DD
  const body: Record<string, unknown> = {
    member: input.member,
    fees: [{ plan: input.item.id, date }],
    options: {
      shouldSendInvoice: false,
      shouldInvoiceImmediately: false,
      shouldChargeImmediately: false,
      shouldRequireCreditCard: false,
    },
  };

  const res = await fetch(`${apiBase}/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OfficeRnD checkout failed [${res.status}]: ${txt}`);
  }
  const raw = await res.json();
  const feeArr = Array.isArray(raw?.fees) ? raw.fees : [];
  const first = feeArr[0] ?? raw;
  return {
    id: first?._id ?? first?.id ?? raw?._id ?? raw?.id ?? null,
    planType: "OneOff",
    raw,
  };
}
