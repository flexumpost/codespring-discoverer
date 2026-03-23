import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { NewShipmentEmail } from "../_shared/email-templates/new-shipment.tsx";
import { ShipmentDispatchedEmail } from "../_shared/email-templates/shipment-dispatched.tsx";
import { WelcomeShipmentEmail } from "../_shared/email-templates/welcome-shipment.tsx";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Verify caller via JWT claims (avoids session_not_found errors)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const callerId = claimsData.claims.sub as string;
    const callerEmail = (claimsData.claims.email as string) ?? "";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", claims.user.id)
      .eq("role", "operator")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { tenant_id, mail_type, stamp_number, template_slug, tracking_number, is_new_tenant } = await req.json();
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get tenant
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, company_name, contact_first_name, contact_last_name, contact_email, user_id")
      .eq("id", tenant_id)
      .maybeSingle();

    if (!tenant || !tenant.contact_email) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "no contact_email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine slug: welcome_shipment for new tenants, otherwise provided or default
    const slug = is_new_tenant ? "welcome_shipment" : (template_slug || "new_shipment");

    // Get template
    const { data: template } = await supabaseAdmin
      .from("email_templates")
      .select("subject, body")
      .eq("slug", slug)
      .maybeSingle();

    if (!template) {
      return new Response(
        JSON.stringify({ error: `Template '${slug}' not found` }),
        { status: 404, headers: corsHeaders }
      );
    }

    const name = escapeHtml([tenant.contact_first_name, tenant.contact_last_name].filter(Boolean).join(" ") || tenant.company_name);
    const companyNameEscaped = escapeHtml(tenant.company_name);
    const mailTypeLabel = mail_type === "pakke" ? "pakke" : "forsendelse";
    const stampLabel = stamp_number ? escapeHtml(String(stamp_number)) : "";
    const trackingLabel = tracking_number ? escapeHtml(String(tracking_number)) : "";

    const subject = template.subject
      .replace(/\{\{company_name\}\}/g, companyNameEscaped)
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{stamp_number\}\}/g, stampLabel)
      .replace(/\{\{mail_type\}\}/g, mailTypeLabel)
      .replace(/\{\{tracking_number\}\}/g, trackingLabel);

    const bodyRaw = template.body
      .replace(/\{\{company_name\}\}/g, companyNameEscaped)
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{stamp_number\}\}/g, stampLabel)
      .replace(/\{\{mail_type\}\}/g, mailTypeLabel)
      .replace(/\{\{tracking_number\}\}/g, trackingLabel);

    const bodyHtml = bodyRaw
      .replace(/\\n/g, '\n')
      .split(/\n+/)
      .filter((p: string) => p.trim())
      .map((p: string) => `<p style="font-size:14px;color:hsl(215.4,16.3%,46.9%);line-height:1.6;margin:0 0 12px">${p.trim()}</p>`)
      .join("");

    const loginUrl = "https://codespring-discoverer.lovable.app/login";

    let html: string;

    if (is_new_tenant && tenant.user_id) {
      // Generate a recovery link so the user can set their password
      const origin = "https://post.flexum.dk";
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: tenant.contact_email,
        options: { redirectTo: `${origin}/set-password` },
      });

      if (linkError || !linkData?.properties?.action_link) {
        console.error("Failed to generate recovery link:", linkError);
        // Fall back to login URL if link generation fails
        html = await renderAsync(
          WelcomeShipmentEmail({ name, subject, bodyHtml, confirmationUrl: loginUrl })
        );
      } else {
        html = await renderAsync(
          WelcomeShipmentEmail({ name, subject, bodyHtml, confirmationUrl: linkData.properties.action_link })
        );
      }
    } else if (slug === "shipment_dispatched") {
      html = await renderAsync(
        ShipmentDispatchedEmail({
          name,
          subject,
          bodyHtml,
          loginUrl,
          trackingNumber: trackingLabel || undefined,
          stampNumber: stampLabel || undefined,
          mailTypeLabel,
        })
      );
    } else if (is_new_tenant) {
      // New tenant but no user_id yet — fallback to welcome with login URL
      html = await renderAsync(
        WelcomeShipmentEmail({ name, subject, bodyHtml, confirmationUrl: loginUrl })
      );
    } else {
      html = await renderAsync(
        NewShipmentEmail({ name, subject, bodyHtml, loginUrl })
      );
    }

    const plainText = bodyRaw.replace(/<[^>]*>/g, "");

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Flexum <kontakt@flexum.dk>",
        to: [tenant.contact_email],
        subject,
        html,
        text: plainText,
      }),
    });

    const resendBody = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(`Resend API error ${resendRes.status}: ${JSON.stringify(resendBody)}`);
    }

    await supabaseAdmin.from("email_send_log").insert({
      message_id: resendBody.id || crypto.randomUUID(),
      template_name: slug,
      recipient_email: tenant.contact_email,
      status: "sent",
      metadata: { tenant_id: tenant.id, mail_type, stamp_number, provider: "resend", is_new_tenant: !!is_new_tenant },
    });

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-new-mail-email error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
