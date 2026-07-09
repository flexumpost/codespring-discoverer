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
      .eq("user_id", callerId)
      .eq("role", "operator")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { tenant_id, mail_type, stamp_number, template_slug, tracking_number, is_new_tenant, test_recipient_email, stamp_numbers, tracking_numbers } = await req.json();
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const stampList: string[] = Array.isArray(stamp_numbers) && stamp_numbers.length
      ? stamp_numbers.map((s: number | string) => String(s))
      : (stamp_number ? [String(stamp_number)] : []);
    const trackingList: string[] = Array.isArray(tracking_numbers) && tracking_numbers.length
      ? tracking_numbers.map((t: string) => String(t))
      : (tracking_number ? [String(tracking_number)] : []);

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

    // Auto-detect: does the tenant's user still need to set a password?
    // If the user has never signed in, treat this send as a welcome/onboarding
    // send regardless of what the client passed, so the email carries a fresh
    // 24h onboarding link instead of pointing to /login.
    let needsOnboarding = false;
    if (tenant.user_id) {
      try {
        const { data: userLookup } = await supabaseAdmin.auth.admin.getUserById(tenant.user_id);
        if (userLookup?.user && !userLookup.user.last_sign_in_at) {
          needsOnboarding = true;
        }
      } catch (e) {
        console.warn("getUserById failed for tenant.user_id", tenant.user_id, e);
      }
    }
    const effectiveIsNew = !!is_new_tenant || needsOnboarding;

    // Fetch mail items for this tenant to include in the email
    let itemsListHtml = "";
    const { data: mailItems } = await supabaseAdmin
      .from("mail_items")
      .select("stamp_number, sender_name, mail_type")
      .eq("tenant_id", tenant_id)
      .eq("status", "ny")
      .order("created_at", { ascending: false });

    if (mailItems && mailItems.length > 0) {
      const listItems = mailItems.map((item: { stamp_number: number | null; sender_name: string | null; mail_type: string }) => {
        const stamp = item.stamp_number ? `#${item.stamp_number}` : "Uden nr.";
        const sender = item.sender_name ? escapeHtml(item.sender_name) : "Ukendt afsender";
        const typeLabel = item.mail_type === "pakke" ? "📦" : "✉️";
        return `<li style="font-size:14px;color:hsl(215.4,16.3%,46.9%);line-height:1.8;margin:0">${typeLabel} ${stamp} — fra: ${sender}</li>`;
      }).join("");
      itemsListHtml = `<p style="font-size:14px;color:hsl(215.4,16.3%,46.9%);line-height:1.6;margin:16px 0 8px;font-weight:600">Du har modtaget følgende forsendelser:</p><ul style="margin:0 0 16px;padding-left:20px">${listItems}</ul>`;
    }

    // Fetch extra recipient emails from tenant_users → profiles
    const { data: tenantUsers } = await supabaseAdmin
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", tenant_id);

    const extraEmails: string[] = [];
    if (tenantUsers?.length) {
      const userIds = tenantUsers.map((tu: { user_id: string }) => tu.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("id", userIds);
      if (profiles) {
        const seen = new Set<string>([tenant.contact_email.toLowerCase()]);
        for (const p of profiles) {
          if (!p.email) continue;
          const lower = p.email.toLowerCase();
          if (seen.has(lower)) continue;
          seen.add(lower);
          extraEmails.push(p.email);
        }
      }
    }

    // Determine slug: welcome_shipment for new tenants, otherwise provided or default
    const slug = effectiveIsNew ? "welcome_shipment" : (template_slug || "new_shipment");

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
    const stampLabel = stampList.length ? escapeHtml(stampList.join(", ")) : "";
    const trackingLabel = trackingList.length ? escapeHtml(trackingList[0]) : "";

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

    const slug_is_list_eligible = slug === "new_shipment" || slug === "welcome_shipment";

    const bodyHtml = bodyRaw
      .replace(/\\n/g, '\n')
      .split(/\n+/)
      .filter((p: string) => p.trim())
      .map((p: string) => `<p style="font-size:14px;color:hsl(215.4,16.3%,46.9%);line-height:1.6;margin:0 0 12px">${p.trim()}</p>`)
      .join("") + (slug_is_list_eligible ? itemsListHtml : "");

    const loginUrl = "https://post.flexum.dk/login";

    let html: string;

    if (effectiveIsNew && tenant.user_id) {
      // Generate a custom onboarding token valid for 24 hours
      const origin = "https://post.flexum.dk";
      let confirmationUrl = loginUrl;

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data: tokenRow, error: tokenError } = await supabaseAdmin
        .from("onboarding_tokens")
        .insert({ email: tenant.contact_email, expires_at: expiresAt })
        .select("token")
        .single();

      if (tokenError || !tokenRow?.token) {
        console.error("Failed to create onboarding token:", tokenError);
      } else {
        confirmationUrl = `${origin}/set-password?onboarding_token=${tokenRow.token}`;
      }

      console.log("confirmationUrl for welcome_shipment:", confirmationUrl);
      if (!confirmationUrl || !confirmationUrl.startsWith("http")) {
        console.error("Invalid confirmationUrl, using fallback:", confirmationUrl);
        confirmationUrl = loginUrl;
      }


      html = await renderAsync(
        WelcomeShipmentEmail({ name, subject, bodyHtml, confirmationUrl })
      );
    } else if (slug === "shipment_dispatched") {
      html = await renderAsync(
        ShipmentDispatchedEmail({
          name,
          subject,
          bodyHtml,
          loginUrl,
          trackingNumber: trackingList[0] || undefined,
          stampNumber: stampList.length === 1 ? stampList[0] : undefined,
          stampNumbers: stampList.length > 1 ? stampList : undefined,
          trackingNumbers: trackingList.length > 1 ? trackingList : undefined,
          mailTypeLabel,
        })
      );
    } else if (effectiveIsNew) {
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

    // Helper: post to Resend with one 429 retry honoring Retry-After
    const sendViaResend = async (payload: Record<string, unknown>) => {
      const doFetch = () =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      let res = await doFetch();
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get("retry-after");
        const waitSec = retryAfterHeader ? Math.max(0, parseFloat(retryAfterHeader)) : 1;
        const waitMs = Math.min(5000, Math.max(500, Math.ceil(waitSec * 1000)));
        await res.text().catch(() => {});
        console.warn(`Resend 429 rate-limited; retrying after ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
        res = await doFetch();
      }
      const body = await res.json().catch(() => ({}));
      return { res, body };
    };

    const { res: resendRes, body: resendBody } = await sendViaResend({
      from: "Flexum Coworking <kontakt@flexum.dk>",
      to: [test_recipient_email || tenant.contact_email],
      subject: test_recipient_email ? `[TEST] ${subject}` : subject,
      html,
      text: plainText,
    });

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

    // Send to extra tenant_users (standard template, no welcome/magic-link).
    // Throttle to stay under Resend's 5 req/sec limit.
    for (const extraEmail of test_recipient_email ? [] : extraEmails) {
      try {
        // ~250ms spacing keeps us safely under 5 req/sec across this and other concurrent invocations
        await new Promise((r) => setTimeout(r, 250));

        const extraHtml = await renderAsync(
          slug === "shipment_dispatched"
            ? ShipmentDispatchedEmail({
                name,
                subject,
                bodyHtml,
                loginUrl,
                trackingNumber: trackingList[0] || undefined,
                stampNumber: stampList.length === 1 ? stampList[0] : undefined,
                stampNumbers: stampList.length > 1 ? stampList : undefined,
                trackingNumbers: trackingList.length > 1 ? trackingList : undefined,
                mailTypeLabel,
              })
            : NewShipmentEmail({ name, subject, bodyHtml, loginUrl })
        );

        const { res: extraRes, body: extraBody } = await sendViaResend({
          from: "Flexum Coworking <kontakt@flexum.dk>",
          to: [extraEmail],
          subject,
          html: extraHtml,
          text: plainText,
        });

        await supabaseAdmin.from("email_send_log").insert({
          message_id: extraBody.id || crypto.randomUUID(),
          template_name: slug,
          recipient_email: extraEmail,
          status: extraRes.ok ? "sent" : "failed",
          error_message: extraRes.ok ? null : JSON.stringify(extraBody),
          metadata: { tenant_id: tenant.id, mail_type, stamp_number, provider: "resend", extra_recipient: true },
        });

        if (!extraRes.ok) {
          console.warn(`Failed to send to extra recipient ${extraEmail}:`, extraBody);
        }
      } catch (extraErr) {
        console.warn(`Error sending to extra recipient ${extraEmail}:`, extraErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: true, extra_recipients: extraEmails.length }), {
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
