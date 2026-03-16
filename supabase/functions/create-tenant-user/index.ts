import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const body = await req.json();
    const { email, password, full_name, mode } = body;

    // Support both tenant_ids (array) and tenant_id (single) for backwards compat
    let tenantIds: string[] = body.tenant_ids ?? [];
    if (tenantIds.length === 0 && body.tenant_id) {
      tenantIds = [body.tenant_id];
    }

    if (tenantIds.length === 0 || !email) {
      return new Response(
        JSON.stringify({ error: "tenant_ids (or tenant_id) and email required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In non-invite mode, password is required
    if (mode !== "invite" && !password) {
      return new Response(
        JSON.stringify({ error: "password required (or use mode: 'invite')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if caller is operator
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "operator")
      .maybeSingle();
    const isOperator = !!roleCheck;

    // Verify caller owns all specified tenants (or is operator)
    if (!isOperator) {
      const { data: ownedTenants } = await adminClient
        .from("tenants")
        .select("id")
        .eq("user_id", callerId)
        .in("id", tenantIds);

      const ownedIds = new Set((ownedTenants ?? []).map((t) => t.id));
      const unauthorized = tenantIds.filter((tid) => !ownedIds.has(tid));
      if (unauthorized.length > 0) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let newUserId: string;
    let existingUser = false;

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const found = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let recoveryLink: string | null = null;

    if (found) {
      newUserId = found.id;
      existingUser = true;
    } else if (mode === "invite") {
      // Create user without sending the default invite email
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: full_name || "" },
        });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      newUserId = newUser.user.id;

      // Generate a recovery link so the tenant can set their password
      const { data: linkData, error: linkError } =
        await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
        });

      if (!linkError && linkData?.properties?.action_link) {
        recoveryLink = linkData.properties.action_link;
      }
    } else {
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name || "" },
        });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      newUserId = newUser.user.id;
    }

    // Assign tenant role (skip if already has it)
    if (!existingUser) {
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: newUserId, role: "tenant" });

      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Link to all specified tenants (skip duplicates)
    for (const tid of tenantIds) {
      const { data: existingLink } = await adminClient
        .from("tenant_users")
        .select("id")
        .eq("tenant_id", tid)
        .eq("user_id", newUserId)
        .maybeSingle();

      if (!existingLink) {
        await adminClient
          .from("tenant_users")
          .insert({ tenant_id: tid, user_id: newUserId });
      }
    }



    // Update tenant's user_id so RLS works for the primary owner
    for (const tid of tenantIds) {
      await adminClient
        .from("tenants")
        .update({ user_id: newUserId })
        .eq("id", tid)
        .is("user_id", null);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId, mode: mode || "password", recovery_link: recoveryLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
