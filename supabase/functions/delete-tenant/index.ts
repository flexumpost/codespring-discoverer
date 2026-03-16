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

    // Verify caller is operator
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Check operator role
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "operator")
      .single();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Kun operatører kan slette lejere" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant to confirm it exists
    const { data: tenant, error: tErr } = await admin
      .from("tenants")
      .select("id, user_id")
      .eq("id", tenant_id)
      .single();

    if (tErr || !tenant) {
      return new Response(JSON.stringify({ error: "Lejer ikke fundet" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get all tenant_users for this tenant
    const { data: tuRows } = await admin
      .from("tenant_users")
      .select("id, user_id")
      .eq("tenant_id", tenant_id);

    // 2. Delete notifications linked to mail_items of this tenant
    const { data: mailItems } = await admin
      .from("mail_items")
      .select("id")
      .eq("tenant_id", tenant_id);

    if (mailItems && mailItems.length > 0) {
      const mailIds = mailItems.map((m) => m.id);
      await admin.from("notifications").delete().in("mail_item_id", mailIds);
      await admin.from("mail_item_logs").delete().in("mail_item_id", mailIds);
    }

    // 3. Delete mail_items
    await admin.from("mail_items").delete().eq("tenant_id", tenant_id);

    // 4. Delete tenant_users rows
    await admin.from("tenant_users").delete().eq("tenant_id", tenant_id);

    // 5. Collect user IDs to clean up (tenant_users + owner)
    const userIdsToDelete = new Set<string>();
    if (tuRows) {
      for (const tu of tuRows) {
        userIdsToDelete.add(tu.user_id);
      }
    }
    if (tenant.user_id) {
      userIdsToDelete.add(tenant.user_id);
    }

    // 6. Delete tenant record
    await admin.from("tenants").delete().eq("id", tenant_id);

    // 7. For each user, check if they still have other tenants; if not, delete them
    for (const uid of userIdsToDelete) {
      // Check if user owns other tenants
      const { data: otherTenants } = await admin
        .from("tenants")
        .select("id")
        .eq("user_id", uid)
        .limit(1);

      // Check if user has other tenant_users links
      const { data: otherLinks } = await admin
        .from("tenant_users")
        .select("id")
        .eq("user_id", uid)
        .limit(1);

      if ((!otherTenants || otherTenants.length === 0) && (!otherLinks || otherLinks.length === 0)) {
        // No remaining associations — delete roles and auth user
        await admin.from("user_roles").delete().eq("user_id", uid);
        await admin.auth.admin.deleteUser(uid);
      }
    }

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
