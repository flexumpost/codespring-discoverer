// Test-OfficeRnD-connection: lets operators verify the v2 integration
// without creating charges. Requires the caller to be an operator.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  findItemByName,
  findMembersByEmail,
  getOfficeRndToken,
  v2Base,
} from "../_shared/officernd.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Step {
  step: string;
  ok: boolean;
  detail?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const clientId = Deno.env.get("OFFICERND_CLIENT_ID");
  const clientSecret = Deno.env.get("OFFICERND_CLIENT_SECRET");
  const orgSlugEnv = Deno.env.get("OFFICERND_ORG_SLUG");

  const steps: Step[] = [];
  const push = (s: Step) => { steps.push(s); return s; };

  try {
    // Operator auth check via getClaims (avoids stale-session 401)
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Missing Authorization header");

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await caller.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      throw new Error("Invalid session");
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "operator")
      .maybeSingle();
    if (!roleRow) throw new Error("Operator role required");

    const body = await req.json().catch(() => ({}));
    const testEmail: string | null = body.email ?? null;
    const testItemName: string | null = body.item_name ?? null;

    // Resolve org slug from settings or env
    const { data: settings } = await admin
      .from("officernd_settings")
      .select("org_slug")
      .eq("id", 1)
      .single();
    const orgSlug = settings?.org_slug || orgSlugEnv;

    push({ step: "Settings", ok: !!orgSlug, detail: orgSlug ? `org_slug = ${orgSlug}` : "missing org_slug" });
    if (!orgSlug) throw new Error("org_slug missing");
    if (!clientId || !clientSecret) {
      push({ step: "Credentials", ok: false, detail: "OFFICERND_CLIENT_ID / OFFICERND_CLIENT_SECRET missing" });
      throw new Error("Missing credentials");
    }
    push({ step: "Credentials", ok: true, detail: "client_id/secret present" });

    // 1. Token
    const ornToken = await getOfficeRndToken({ clientId, clientSecret, orgSlug });
    push({ step: "OAuth token (v2)", ok: true, detail: `length ${ornToken.length}` });

    const apiBase = v2Base(orgSlug);

    // 2. Member lookup (only if email provided)
    if (testEmail) {
      try {
        const members = await findMembersByEmail(apiBase, ornToken, testEmail);
        if (members.length === 0) {
          push({ step: `Member lookup: ${testEmail}`, ok: false, detail: "No matching member in OfficeRnD" });
        } else {
          const first = members[0];
          push({
            step: `Member lookup: ${testEmail}`,
            ok: true,
            detail: `${members.length} hit(s); first _id=${first._id}, team=${first.team ?? "—"}`,
          });
        }
      } catch (e) {
        push({ step: `Member lookup: ${testEmail}`, ok: false, detail: e instanceof Error ? e.message : String(e) });
      }
    }

    // 3. Item lookup (only if name provided)
    if (testItemName) {
      try {
        const item = await findItemByName(apiBase, ornToken, testItemName);
        if (!item) {
          push({ step: `Item lookup: ${testItemName}`, ok: false, detail: "Not found in /fees or /plans" });
        } else {
          push({ step: `Item lookup: ${testItemName}`, ok: true, detail: `found in /${item.source}, id=${item.id}, price=${item.price ?? "n/a"}` });
        }
      } catch (e) {
        push({ step: `Item lookup: ${testItemName}`, ok: false, detail: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      steps,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
