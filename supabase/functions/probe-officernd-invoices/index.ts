// Temporary diagnostic: find the correct OfficeRnD invoices endpoint.
import { getOfficeRndToken, INVOICE_SCOPE } from "../_shared/officernd.ts";

Deno.serve(async () => {
  const clientId = Deno.env.get("OFFICERND_CLIENT_ID")!;
  const clientSecret = Deno.env.get("OFFICERND_CLIENT_SECRET")!;
  const orgSlug = Deno.env.get("OFFICERND_ORG_SLUG") || "flexum";

  const results: any[] = [];
  for (const scopes of [[INVOICE_SCOPE], []]) {
    let token: string;
    try {
      token = await getOfficeRndToken({ clientId, clientSecret, orgSlug }, scopes);
    } catch (e) {
      results.push({ scopes, tokenError: String(e) });
      continue;
    }
    const candidates = [
      `https://app.officernd.com/api/v1/organizations/${orgSlug}/invoices`,
      `https://app.officernd.com/api/v2/organizations/${orgSlug}/invoices`,
      `https://app.officernd.com/api/v2/organizations/${orgSlug}/billing/invoices`,
      `https://app.officernd.com/api/v1/organizations/${orgSlug}/billing/invoices`,
      `https://app.officernd.com/api/v2/organizations/${orgSlug}/fees`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?limit=1`, { headers: { Authorization: `Bearer ${token}` } });
        const txt = (await res.text()).slice(0, 300);
        results.push({ scopes: scopes.join(",") || "base", url, status: res.status, body: txt });
      } catch (e) {
        results.push({ scopes: scopes.join(",") || "base", url, error: String(e) });
      }
    }
  }
  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
