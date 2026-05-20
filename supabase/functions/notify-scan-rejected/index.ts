import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const callerId = claimsData.claims.sub as string;

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

    const { mail_item_id } = await req.json();
    if (!mail_item_id) {
      return new Response(JSON.stringify({ error: "mail_item_id required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: item } = await supabaseAdmin
      .from("mail_items")
      .select("id, tenant_id, stamp_number, action_rejected_reason")
      .eq("id", mail_item_id)
      .maybeSingle();

    if (!item || !item.tenant_id) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no tenant" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reason = item.action_rejected_reason || "";
    const stampPart = item.stamp_number ? ` (nr. ${item.stamp_number})` : "";

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, company_name, contact_first_name, contact_last_name, contact_email, user_id")
      .eq("id", item.tenant_id)
      .maybeSingle();

    // In-app notification to tenant owner
    if (tenant?.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: tenant.user_id,
        mail_item_id: item.id,
        title: "Scanning annulleret",
        message:
          `Din anmodning om scanning${stampPart} er blevet annulleret.` +
          (reason ? `\nÅrsag: ${reason}` : "") +
          `\nHvis du ikke foretager dig yderligere, sendes brevet til dig på næste forsendelsesdato.`,
      });
    }

    if (!tenant?.contact_email) {
      return new Response(JSON.stringify({ ok: true, sent: false, reason: "no contact_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect extra recipients
    const recipients: string[] = [tenant.contact_email];
    const { data: tenantUsers } = await supabaseAdmin
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", tenant.id);
    if (tenantUsers?.length) {
      const userIds = tenantUsers.map((tu: { user_id: string }) => tu.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("id", userIds);
      if (profiles) {
        for (const p of profiles) {
          if (p.email && !recipients.includes(p.email)) recipients.push(p.email);
        }
      }
    }

    const name = escapeHtml(
      [tenant.contact_first_name, tenant.contact_last_name].filter(Boolean).join(" ") ||
        tenant.company_name
    );
    const stampLabel = item.stamp_number ? `#${escapeHtml(String(item.stamp_number))}` : "";
    const reasonHtml = escapeHtml(reason).replace(/\n/g, "<br>");
    const subject = `Scanning annulleret${stampLabel ? ` ${stampLabel}` : ""}`;
    const loginUrl = "https://post.flexum.dk/login";

    const html = `<!DOCTYPE html>
<html lang="da"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f7;padding:32px 0">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;padding:32px;max-width:560px">
        <tr><td>
          <h1 style="font-size:20px;color:#111827;margin:0 0 16px">Hej ${name}</h1>
          <p style="font-size:14px;color:hsl(215.4,16.3%,46.9%);line-height:1.6;margin:0 0 16px">
            Vi har desværre måttet annullere din anmodning om scanning af forsendelse${stampLabel ? ` <strong>${stampLabel}</strong>` : ""}.
          </p>
          ${reason ? `
          <p style="font-size:14px;color:#111827;line-height:1.6;margin:0 0 8px;font-weight:600">Begrundelse fra operatør:</p>
          <blockquote style="margin:0 0 20px;padding:12px 16px;background:#f3f4f6;border-left:4px solid #d1d5db;border-radius:4px;font-size:14px;color:#374151;line-height:1.6">
            ${reasonHtml}
          </blockquote>` : ""}
          <p style="font-size:14px;color:hsl(215.4,16.3%,46.9%);line-height:1.6;margin:0 0 24px">
            Hvis du ikke foretager dig yderligere, sender vi i stedet brevet til dig på næste forsendelsesdato.
            Du kan logge ind og vælge en anden handling, hvis du ønsker det.
          </p>
          <p style="margin:0 0 24px">
            <a href="${loginUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600">Log ind</a>
          </p>
          <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;border-top:1px solid #e5e7eb;padding-top:16px">
            Med venlig hilsen<br>Flexum Coworking
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const plainText =
      `Hej ${name.replace(/&amp;/g, "&")}\n\n` +
      `Vi har desværre måttet annullere din anmodning om scanning af forsendelse${stampLabel ? ` ${stampLabel}` : ""}.\n\n` +
      (reason ? `Begrundelse fra operatør:\n${reason}\n\n` : "") +
      `Hvis du ikke foretager dig yderligere, sender vi i stedet brevet til dig på næste forsendelsesdato.\n` +
      `Du kan logge ind og vælge en anden handling: ${loginUrl}\n\n` +
      `Med venlig hilsen\nFlexum Coworking`;

    let sentCount = 0;
    for (const to of recipients) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Flexum Coworking <kontakt@flexum.dk>",
            to: [to],
            subject,
            html,
            text: plainText,
          }),
        });
        const resendBody = await resendRes.json();
        await supabaseAdmin.from("email_send_log").insert({
          message_id: resendBody.id || crypto.randomUUID(),
          template_name: "scan_rejected",
          recipient_email: to,
          status: resendRes.ok ? "sent" : "failed",
          error_message: resendRes.ok ? null : JSON.stringify(resendBody),
          metadata: { tenant_id: tenant.id, mail_item_id: item.id, stamp_number: item.stamp_number, provider: "resend" },
        });
        if (resendRes.ok) sentCount++;
        else console.warn("Resend failed for", to, resendBody);
      } catch (err) {
        console.warn("Send error for", to, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount, recipients: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-scan-rejected error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
