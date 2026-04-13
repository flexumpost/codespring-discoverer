import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { WelcomeEmail } from "../_shared/email-templates/welcome.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendWelcomeEmail(
  adminClient: ReturnType<typeof createClient>,
  tenantId: string,
  contactEmail: string,
  contactName: string,
  companyName: string,
) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured, skipping welcome email");
    return;
  }

  try {
    // Get welcome template
    const { data: template } = await adminClient
      .from("email_templates")
      .select("subject, body")
      .eq("slug", "welcome")
      .maybeSingle();

    if (!template) {
      console.error("Welcome email template not found (slug: welcome)");
      return;
    }

    const name = escapeHtml(contactName || companyName);
    const companyNameEscaped = escapeHtml(companyName);
    const subject = template.subject
      .replace(/\{\{company_name\}\}/g, companyNameEscaped)
      .replace(/\{\{name\}\}/g, name);
    const bodyRaw = template.body
      .replace(/\{\{company_name\}\}/g, companyNameEscaped)
      .replace(/\{\{name\}\}/g, name);

    const bodyHtml = bodyRaw
      .replace(/\\n/g, '\n')
      .split(/\n+/)
      .filter((p: string) => p.trim())
      .map((p: string) => `<p style="font-size:14px;color:hsl(215.4,16.3%,46.9%);line-height:1.6;margin:0 0 12px">${p.trim()}</p>`)
      .join("");

    const loginUrl = "https://codespring-discoverer.lovable.app/login";

    const html = await renderAsync(
      WelcomeEmail({
        name,
        subject,
        bodyHtml,
        loginUrl,
        recoveryLink: null,
      })
    );

    const plainText = bodyRaw.replace(/<[^>]*>/g, "");

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Flexum Coworking <kontakt@flexum.dk>",
        to: [contactEmail],
        subject,
        html,
        text: plainText,
      }),
    });

    const resendBody = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(`Resend API error ${resendRes.status}: ${JSON.stringify(resendBody)}`);
    }

    // Log successful send
    await adminClient.from("email_send_log").insert({
      message_id: resendBody.id || crypto.randomUUID(),
      template_name: "welcome",
      recipient_email: contactEmail,
      status: "sent",
      metadata: { tenant_id: tenantId, provider: "resend", source: "zoho-webhook" },
    });

    // Update welcome_email_sent_at
    await adminClient
      .from("tenants")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", tenantId);

    console.log("Welcome email sent to", contactEmail);
  } catch (e) {
    console.error("Failed to send welcome email:", e);

    await adminClient.from("email_send_log").insert({
      template_name: "welcome",
      recipient_email: contactEmail,
      status: "failed",
      error_message: String(e),
      metadata: { tenant_id: tenantId, provider: "resend", source: "zoho-webhook" },
    });
  }
}

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
        default_mail_action: "send",
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
      default_mail_action: "send",
    });

    // Send welcome email if contact email is provided
    if (contactEmail) {
      const contactName = [contactFirstName, contactLastName].filter(Boolean).join(" ");
      await sendWelcomeEmail(adminClient, tenant.id, contactEmail, contactName, companyName);
    }

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
