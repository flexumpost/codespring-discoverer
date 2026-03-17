import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub as string;

    const { tenant_user_id } = await req.json();
    if (!tenant_user_id) {
      return new Response(JSON.stringify({ error: "tenant_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Get the tenant_users row
    const { data: tuRow, error: tuErr } = await admin
      .from("tenant_users")
      .select("id, user_id, tenant_id")
      .eq("id", tenant_user_id)
      .single();

    if (tuErr || !tuRow) {
      return new Response(JSON.stringify({ error: "Postmodtager ikke fundet" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is the tenant owner
    const { data: tenant } = await admin
      .from("tenants")
      .select("user_id")
      .eq("id", tuRow.tenant_id)
      .single();

    if (!tenant || tenant.user_id !== callerId) {
      return new Response(JSON.stringify({ error: "Kun kontoejer kan slette postmodtagere" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUserId = tuRow.user_id;

    // Prevent deleting the contact person (tenant owner)
    if (targetUserId === tenant.user_id) {
      return new Response(JSON.stringify({ error: "Kontaktpersonen kan ikke slettes" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete tenant_users row
    await admin.from("tenant_users").delete().eq("id", tenant_user_id);

    // Delete user_roles row
    await admin.from("user_roles").delete().eq("user_id", targetUserId);

    // Delete auth user
    await admin.auth.admin.deleteUser(targetUserId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
