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
    // --- Validate webhook secret ---
    const webhookSecret = Deno.env.get("ZOHO_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("ZOHO_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept secret via query param (?secret=...) or header (x-webhook-secret)
    const url = new URL(req.url);
    const secretParam = url.searchParams.get("secret");
    const secretHeader = req.headers.get("x-webhook-secret");
    const providedSecret = secretParam || secretHeader;

    if (providedSecret !== webhookSecret) {
      console.warn("Invalid webhook secret provided");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse body ---
    const body = await req.json();
    console.log("Zoho webhook payload:", JSON.stringify(body));

    // Zoho sends data in various formats depending on webhook config.
    // We support both flat fields and nested structures.
    const companyName =
      body.account_name ||
      body.Account_Name ||
      body.company_name ||
      body.deal_name ||
      body.Deal_Name ||
      null;

    const contactEmail =
      body.contact_email ||
      body.Contact_Email ||
      body.email ||
      body.Email ||
      null;

    const contactFirstName =
      body.contact_first_name ||
      body.Contact_First_Name ||
      body.first_name ||
      body.First_Name ||
      "";

    const contactLastName =
      body.contact_last_name ||
      body.Contact_Last_Name ||
      body.last_name ||
      body.Last_Name ||
      "";

    if (!companyName) {
      console.error("Missing company/account name in payload");
      return new Response(
        JSON.stringify({ error: "company_name or account_name required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Create tenant ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up the default tenant type ("Lite")
    const { data: tenantType, error: typeError } = await adminClient
      .from("tenant_types")
      .select("id")
      .eq("name", "Lite")
      .maybeSingle();

    if (typeError || !tenantType) {
      console.error("Could not find default tenant type 'Lite':", typeError);
      return new Response(
        JSON.stringify({ error: "Default tenant type not found" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for duplicate (same company name + contact email)
    if (contactEmail) {
      const { data: existing } = await adminClient
        .from("tenants")
        .select("id")
        .eq("company_name", companyName)
        .eq("contact_email", contactEmail)
        .maybeSingle();

      if (existing) {
        console.log("Tenant already exists, skipping:", existing.id);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Tenant already exists",
            tenant_id: existing.id,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const { data: tenant, error: insertError } = await adminClient
      .from("tenants")
      .insert({
        company_name: companyName,
        contact_email: contactEmail || null,
        contact_first_name: contactFirstName || null,
        contact_last_name: contactLastName || null,
        tenant_type_id: tenantType.id,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to create tenant:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create tenant", detail: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Tenant created successfully:", tenant.id);

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenant.id,
        company_name: companyName,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Zoho webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
