import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { operatorDeletionError } from "../_shared/operator-deletion.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return reply({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !key) throw new Error("Missing configuration");
    const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: claimsError } = await caller.auth.getClaims(auth.slice(7));
    if (claimsError || !claims?.claims?.sub) return reply({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub;
    const { data: isAdmin, error: adminError } = await caller.rpc("is_operator_administrator");
    if (adminError || isAdmin !== true) return reply({ error: "Kun administratoren kan slette operatører" }, 403);
    const { user_id: targetId } = await req.json();
    if (typeof targetId !== "string" || !/^[0-9a-f-]{36}$/i.test(targetId)) return reply({ error: "Ugyldig operatør" }, 400);
    const admin = createClient(url, key);
    const results = await Promise.all([
      admin.from("operator_administrators").select("user_id").eq("user_id", targetId),
      admin.from("user_roles").select("role").eq("user_id", targetId).eq("role", "operator"),
      admin.from("tenants").select("id").eq("user_id", targetId).limit(1),
      admin.from("tenant_users").select("id").eq("user_id", targetId).limit(1),
    ]);
    if (results.some((result) => result.error)) throw new Error("Kunne ikke kontrollere operatørens adgang");
    const rejection = operatorDeletionError({ callerIsAdmin: true, callerId, targetId,
      targetIsAdmin: Boolean(results[0].data?.length), targetIsOperator: Boolean(results[1].data?.length),
      hasTenantLinks: Boolean(results[2].data?.length || results[3].data?.length) });
    if (rejection) return reply({ error: rejection }, 403);
    // Keep the identity for immutable shipment history, but revoke login and all operator access.
    const { error: banError } = await admin.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
    if (banError) throw new Error("Kunne ikke lukke operatørens login");
    const { error: roleError } = await admin.from("user_roles").delete().eq("user_id", targetId).eq("role", "operator");
    if (roleError) throw new Error("Login er lukket, men operatøren kunne ikke fjernes fra oversigten. Prøv igen.");
    return reply({ success: true });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Kunne ikke slette operatøren" }, 500);
  }
});