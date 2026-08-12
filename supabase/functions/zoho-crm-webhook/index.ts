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

type LogEntry = {
  company_name?: string | null;
  contact_email?: string | null;
  raw_status?: string | null;
  resolved_action: string;
  tenant_id?: string | null;
  tenant_type_name?: string | null;
  address_transfer_status?: string | null;
  welcome_email_status?: string | null;
  success?: boolean;
  error_message?: string | null;
  payload?: unknown;
};

async function logWebhookEvent(
  adminClient: ReturnType<typeof createClient> | null,
  entry: LogEntry,
) {
  try {
    if (!adminClient) return;
    await adminClient.from("zoho_webhook_logs").insert({
      company_name: entry.company_name ?? null,
      contact_email: entry.contact_email ?? null,
      raw_status: entry.raw_status ?? null,
      resolved_action: entry.resolved_action,
      tenant_id: entry.tenant_id ?? null,
      tenant_type_name: entry.tenant_type_name ?? null,
      address_transfer_status: entry.address_transfer_status ?? null,
      welcome_email_status: entry.welcome_email_status ?? null,
      success: entry.success ?? true,
      error_message: entry.error_message ?? null,
      payload: entry.payload ?? null,
    });
  } catch (e) {
    console.error("Failed to log zoho webhook event:", e);
  }
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
    return { ok: false, error: "RESEND_API_KEY not configured" };
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
      return { ok: false, error: "Welcome email template not found" };
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
    return { ok: true, error: null as string | null };
  } catch (e) {
    console.error("Failed to send welcome email:", e);

    await adminClient.from("email_send_log").insert({
      template_name: "welcome",
      recipient_email: contactEmail,
      status: "failed",
      error_message: String(e),
      metadata: { tenant_id: tenantId, provider: "resend", source: "zoho-webhook" },
    });
    return { ok: false, error: String(e) };
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

    const contactPhone =
      body.contact_phone ||
      body.Contact_Phone ||
      body.phone ||
      body.Phone ||
      body.mobile ||
      body.Mobile ||
      null;



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
    const solutionShort =
      body.solution_short ||
      body["Løsning_kort"] ||
      body["losning_kort"] ||
      body["Losning_kort"] ||
      null;

    // Customer status ("Kunde status") — exact field name from Zoho unknown, accept aliases
    const rawStatus =
      body.kunde_status ??
      body.Kunde_status ??
      body.Kunde_Status ??
      body.customer_status ??
      body.Customer_Status ??
      body.status ??
      body.Status ??
      null;

    const normalizedStatus = typeof rawStatus === "string"
      ? rawStatus.trim().toLowerCase()
      : null;

    const isActiveStatus = normalizedStatus === "aktiv adresseservice";
    const isEndedStatus = normalizedStatus === "ophørt samarbejde" ||
      normalizedStatus === "ophort samarbejde";

    console.log("Zoho customer status:", { rawStatus, normalizedStatus, isActiveStatus, isEndedStatus });

    const supabaseUrlEarly = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKeyEarly = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const logClient = createClient(supabaseUrlEarly, serviceRoleKeyEarly);

    if (!companyName) {
      console.error("Missing company/account name in payload");
      await logWebhookEvent(logClient, {
        company_name: null,
        contact_email: contactEmail,
        raw_status: rawStatus,
        resolved_action: "afvist",
        success: false,
        error_message: "Mangler firmanavn (account_name) i payload",
        payload: body,
      });
      return new Response(
        JSON.stringify({ error: "company_name or account_name required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = logClient;

    // Find existing tenant by company name (case-insensitive)
    const { data: existingTenants } = await adminClient
      .from("tenants")
      .select("id, contact_email, welcome_email_sent_at, is_active")
      .ilike("company_name", companyName)
      .limit(1);
    const existingTenant = existingTenants?.[0] ?? null;

    // --- Ended cooperation: switch to "Retur til afsender" and deactivate ---
    if (isEndedStatus) {
      if (!existingTenant) {
        console.log("No tenant found for ended cooperation:", companyName);
        await logWebhookEvent(adminClient, {
          company_name: companyName, contact_email: contactEmail, raw_status: rawStatus,
          resolved_action: "ophoert_samarbejde", success: false,
          error_message: "Ingen lejer fundet med dette firmanavn", payload: body,
        });
        return new Response(
          JSON.stringify({ success: true, message: "No tenant found", company_name: companyName }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: returType } = await adminClient
        .from("tenant_types")
        .select("id")
        .eq("name", "Retur til afsender")
        .maybeSingle();

      if (!returType) {
        console.error("Tenant type 'Retur til afsender' not found");
        await logWebhookEvent(adminClient, {
          company_name: companyName, contact_email: contactEmail, raw_status: rawStatus,
          resolved_action: "ophoert_samarbejde", tenant_id: existingTenant.id, success: false,
          error_message: "Lejertypen 'Retur til afsender' findes ikke", payload: body,
        });
        return new Response(
          JSON.stringify({ error: "Tenant type 'Retur til afsender' not found" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deactivateError } = await adminClient
        .from("tenants")
        .update({ tenant_type_id: returType.id, is_active: false })
        .eq("id", existingTenant.id);

      if (deactivateError) {
        console.error("Failed to deactivate tenant:", deactivateError);
        await logWebhookEvent(adminClient, {
          company_name: companyName, contact_email: contactEmail, raw_status: rawStatus,
          resolved_action: "ophoert_samarbejde", tenant_id: existingTenant.id,
          tenant_type_name: "Retur til afsender", success: false,
          error_message: deactivateError.message, payload: body,
        });
        return new Response(
          JSON.stringify({ error: "Failed to update tenant", detail: deactivateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Tenant set to 'Retur til afsender' and deactivated:", existingTenant.id);
      await logWebhookEvent(adminClient, {
        company_name: companyName, contact_email: contactEmail, raw_status: rawStatus,
        resolved_action: "ophoert_samarbejde", tenant_id: existingTenant.id,
        tenant_type_name: "Retur til afsender",
        address_transfer_status: "ikke_relevant", welcome_email_status: "ikke_relevant",
        success: true, payload: body,
      });
      return new Response(
        JSON.stringify({ success: true, tenant_id: existingTenant.id, action: "ended" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Any other known-but-unhandled status: no-op
    if (normalizedStatus && !isActiveStatus) {
      console.log("Ignoring unhandled customer status:", rawStatus);
      await logWebhookEvent(adminClient, {
        company_name: companyName, contact_email: contactEmail, raw_status: rawStatus,
        resolved_action: "ignoreret", tenant_id: existingTenant?.id ?? null,
        address_transfer_status: "ikke_relevant", welcome_email_status: "ikke_relevant",
        success: true, payload: body,
      });
      return new Response(
        JSON.stringify({ success: true, message: "Status ignored", status: rawStatus }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Active address service (or legacy payload without status): create/update tenant ---

    // Look up tenant type by "Løsning kort", fallback to package_solution, then "Lite"
    let tenantTypeId: string | null = null;
    let resolvedTypeName: string | null = null;
    const solutionName = solutionShort || packageSolution;

    if (solutionName) {
      const { data: matchedType } = await adminClient
        .from("tenant_types")
        .select("id")
        .ilike("name", solutionName)
        .maybeSingle();

      if (matchedType) {
        tenantTypeId = matchedType.id;
        resolvedTypeName = solutionName;
        console.log(`Matched tenant type '${solutionName}':`, tenantTypeId);
      } else {
        console.log(`No tenant type matching '${solutionName}', falling back to Lite`);
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
        await logWebhookEvent(adminClient, {
          company_name: companyName, contact_email: contactEmail, raw_status: rawStatus,
          resolved_action: "aktiv_adresseservice", tenant_id: existingTenant?.id ?? null,
          success: false, error_message: "Standard lejertype 'Lite' ikke fundet", payload: body,
        });
        return new Response(
          JSON.stringify({ error: "Default tenant type not found" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      tenantTypeId = liteType.id;
      resolvedTypeName = "Lite";
    }

    // Determine if we have a complete shipping address
    const hasShippingAddress =
      shippingRecipient?.trim() &&
      shippingAddress?.trim() &&
      shippingZip?.trim() &&
      shippingCity?.trim() &&
      shippingCountry?.trim();

    const tenantFields: Record<string, unknown> = {
      company_name: companyName,
      contact_email: contactEmail || null,
      contact_first_name: contactFirstName || null,
      contact_last_name: contactLastName || null,
      contact_phone: contactPhone,

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
    };

    let tenantId: string;
    let welcomeAlreadySent = false;

    if (existingTenant) {
      // Don't wipe an existing shipping address with empty Zoho values
      if (!hasShippingAddress) {
        for (const key of [
          "shipping_recipient", "shipping_co", "shipping_address", "shipping_address_2",
          "shipping_zip", "shipping_city", "shipping_state", "shipping_country",
          "shipping_confirmed",
        ]) {
          delete tenantFields[key];
        }
      }
      if (!contactEmail) delete tenantFields.contact_email;
      if (!contactPhone) delete tenantFields.contact_phone;


      const { error: updateError } = await adminClient
        .from("tenants")
        .update(tenantFields)
        .eq("id", existingTenant.id);

      if (updateError) {
        console.error("Failed to update tenant:", updateError);
        await logWebhookEvent(adminClient, {
          company_name: companyName, contact_email: contactEmail, raw_status: rawStatus,
          resolved_action: "aktiv_adresseservice", tenant_id: existingTenant.id,
          tenant_type_name: resolvedTypeName, address_transfer_status: "fejlet",
          welcome_email_status: "ikke_sendt", success: false,
          error_message: updateError.message, payload: body,
        });
        return new Response(
          JSON.stringify({ error: "Failed to update tenant", detail: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      tenantId = existingTenant.id;
      welcomeAlreadySent = !!existingTenant.welcome_email_sent_at;
      console.log("Tenant updated from Zoho:", tenantId);
    } else {
      const { data: tenant, error: insertError } = await adminClient
        .from("tenants")
        .insert(tenantFields)
        .select("id")
        .single();

      if (insertError) {
        console.error("Failed to create tenant:", insertError);
        await logWebhookEvent(adminClient, {
          company_name: companyName, contact_email: contactEmail, raw_status: rawStatus,
          resolved_action: "aktiv_adresseservice", tenant_type_name: resolvedTypeName,
          address_transfer_status: "fejlet", welcome_email_status: "ikke_sendt",
          success: false, error_message: insertError.message, payload: body,
        });
        return new Response(
          JSON.stringify({ error: "Failed to create tenant", detail: insertError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      tenantId = tenant.id;
      console.log("Tenant created successfully:", tenantId, {
        solution_short: solutionShort,
        package_solution: packageSolution,
        tenant_type_id: tenantTypeId,
        shipping_confirmed: !!hasShippingAddress,
      });
    }

    // Send welcome email if contact email is provided and not sent before
    const emailForWelcome = contactEmail || existingTenant?.contact_email || null;
    let welcomeStatus = "ikke_relevant";
    let welcomeError: string | null = null;
    if (emailForWelcome && !welcomeAlreadySent) {
      const contactName = [contactFirstName, contactLastName].filter(Boolean).join(" ");
      const res = await sendWelcomeEmail(adminClient, tenantId, emailForWelcome, contactName, companyName);
      welcomeStatus = res?.ok ? "sendt" : "fejlet";
      welcomeError = res?.ok ? null : (res?.error ?? "Ukendt fejl");
    } else if (emailForWelcome && welcomeAlreadySent) {
      welcomeStatus = "allerede_sendt";
    } else {
      welcomeStatus = "ingen_email";
    }

    await logWebhookEvent(adminClient, {
      company_name: companyName,
      contact_email: emailForWelcome,
      raw_status: rawStatus,
      resolved_action: existingTenant ? "opdateret" : "oprettet",
      tenant_id: tenantId,
      tenant_type_name: resolvedTypeName,
      address_transfer_status: hasShippingAddress ? "overfoert" : "mangler_data",
      welcome_email_status: welcomeStatus,
      success: welcomeStatus !== "fejlet",
      error_message: welcomeError,
      payload: body,
    });

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenantId,
        company_name: companyName,
        action: existingTenant ? "updated" : "created",
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
