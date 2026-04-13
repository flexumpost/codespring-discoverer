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

    // Shipping address fields
    const shippingRecipient = body.shipping_recipient || null;
    const shippingCo = body.shipping_co || null;
    const shippingAddress = body.shipping_address || null;
    const shippingAddress2 = body.shipping_address_2 || null;
    const shippingZip = body.shipping_zip || null;
    const shippingCity = body.shipping_city || null;
    const shippingState = body.shipping_state || null;
    const shippingCountry = body.shipping_country || null;

    // Package solution fields
    const packageSolution = body.package_solution || null;
    const solutionShort = body.solution_short || null;

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

    // Look up tenant type by package solution name, fallback to "Lite"
    let tenantTypeId: string | null = null;

    if (packageSolution) {
      const { data: matchedType } = await adminClient
        .from("tenant_types")
        .select("id")
        .eq("name", packageSolution)
        .maybeSingle();

      if (matchedType) {
        tenantTypeId = matchedType.id;
        console.log(`Matched tenant type '${packageSolution}':`, tenantTypeId);
      } else {
        console.log(`No tenant type matching '${packageSolution}', falling back to Lite`);
      }
    }

    if (!tenantTypeId) {
      const { data: liteType, error: typeError } = await adminClient
        .from("tenant_types")
        .select("id")
        .eq("name", "Lite")
        .maybeSingle();

      if (typeError || !liteType) {
        console.error("Could not find default tenant type 'Lite':", typeError);
        return new Response(
          JSON.stringify({ error: "Default tenant type not found" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      tenantTypeId = liteType.id;
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

    // Determine if we have a complete shipping address
    const hasShippingAddress =
      shippingRecipient?.trim() &&
      shippingAddress?.trim() &&
      shippingZip?.trim() &&
      shippingCity?.trim() &&
      shippingCountry?.trim();

    const { data: tenant, error: insertError } = await adminClient
      .from("tenants")
      .insert({
        company_name: companyName,
        contact_email: contactEmail || null,
        contact_first_name: contactFirstName || null,
        contact_last_name: contactLastName || null,
        tenant_type_id: tenantTypeId,
        is_active: true,
        shipping_recipient: shippingRecipient,
        shipping_co: shippingCo,
        shipping_address: shippingAddress,
        shipping_address_2: shippingAddress2,
        shipping_zip: shippingZip,
        shipping_city: shippingCity,
        shipping_state: shippingState,
        shipping_country: shippingCountry,
        shipping_confirmed: !!hasShippingAddress,
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

    console.log("Tenant created successfully:", tenant.id, {
      package_solution: packageSolution,
      solution_short: solutionShort,
      tenant_type_id: tenantTypeId,
      shipping_confirmed: !!hasShippingAddress,
    });

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
