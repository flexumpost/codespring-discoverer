// Temporary diagnostic: find the correct OfficeRnD invoices endpoint.
import { getOfficeRndToken, INVOICE_SCOPE } from "../_shared/officernd.ts";

Deno.serve(async () => {
  const clientId = Deno.env.get("OFFICERND_CLIENT_ID")!;
  const clientSecret = Deno.env.get("OFFICERND_CLIENT_SECRET")!;
  const orgSlug = Deno.env.get("OFFICERND_ORG_SLUG") || "flexum";

  const results: any[] = [];
  const scopeSets = [
    ["officernd.api.read"],
    ["officernd.api.read", "officernd.api.write"],
    ["flex.billing.invoices.read"],
    ["flex.billing.invoices"],
    ["flex.billing.read"],
  ];
  for (const scopes of scopeSets) {
    // Probe raw token issuance per scope set (no fallback), to learn valid scopes.
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: scopes.join(" "),
      client_id: clientId,
      client_secret: clientSecret,
    });
    const tokRes = await fetch("https://identity.officernd.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const tokTxt = await tokRes.text();
    if (!tokRes.ok) {
      results.push({ scopes: scopes.join(","), tokenStatus: tokRes.status, tokenBody: tokTxt.slice(0, 200) });
      continue;
    }
    const token: string = JSON.parse(tokTxt).access_token;
    results.push({ scopes: scopes.join(","), tokenStatus: 200 });
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
