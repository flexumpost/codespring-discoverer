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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find scanned letters where 30 days have passed and not yet archived
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffISO = cutoffDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Items scanned exactly 30 days ago (within that day)
    const startOfCutoff = `${cutoffISO}T00:00:00.000Z`;
    const endOfCutoff = `${cutoffISO}T23:59:59.999Z`;

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("mail_items")
      .select("id, stamp_number, mail_type, tenant_id, scanned_at, tenants(company_name)")
      .not("scanned_at", "is", null)
      .neq("status", "arkiveret")
      .lte("scanned_at", endOfCutoff);

    if (itemsErr) throw itemsErr;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No items due for destruction" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email content
    const rows = items.map((item: any) => {
      const tenant = item.tenants;
      const company = tenant?.company_name ?? "Ukendt lejer";
      const stamp = item.stamp_number ? `Nr. ${item.stamp_number}` : "Uden nr.";
      const type = item.mail_type === "pakke" ? "Pakke" : "Brev";
      const scannedAt = item.scanned_at
        ? new Date(item.scanned_at).toLocaleDateString("da-DK")
        : "";
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${company}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${stamp}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${type}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${scannedAt}</td>
      </tr>`;
    });

    const subject = `Destruerings-påmindelse: ${items.length} forsendelse${items.length > 1 ? "r" : ""} klar til destruering`;
    const html = `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
        <h2 style="color:#1a1a2e">Forsendelser klar til destruering</h2>
        <p>Følgende ${items.length} forsendelse${items.length > 1 ? "r" : ""} har overskredet 30 dages opbevaring efter scanning og bør destrueres:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px 12px;text-align:left">Lejer</th>
              <th style="padding:8px 12px;text-align:left">Nr.</th>
              <th style="padding:8px 12px;text-align:left">Type</th>
              <th style="padding:8px 12px;text-align:left">Scannet</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join("")}
          </tbody>
        </table>
        <p style="color:#666;margin-top:16px">Denne e-mail er sendt automatisk af systemet.</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Flexum <kontakt@flexum.dk>",
        to: ["kontakt@flexum.dk"],
        subject,
        html,
      }),
    });

    const resendBody = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(`Resend error ${resendRes.status}: ${JSON.stringify(resendBody)}`);
    }

    await supabaseAdmin.from("email_send_log").insert({
      message_id: resendBody.id || crypto.randomUUID(),
      template_name: "destruction_due_reminder",
      recipient_email: "kontakt@flexum.dk",
      status: "sent",
      metadata: { item_count: items.length, item_ids: items.map((i: any) => i.id) },
    });

    return new Response(JSON.stringify({ ok: true, notified: items.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-destruction-due error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
