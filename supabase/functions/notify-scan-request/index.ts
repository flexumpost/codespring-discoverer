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

    // Verify caller is authenticated
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
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch mail item with tenant info
    const { data: item } = await supabaseAdmin
      .from("mail_items")
      .select("id, stamp_number, mail_type, tenant_id, tenants(company_name)")
      .eq("id", mail_item_id)
      .maybeSingle();

    if (!item) {
      return new Response(JSON.stringify({ error: "Mail item not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const tenant = (item as any).tenants;
    const companyName = tenant?.company_name ?? "Ukendt lejer";
    const stampLabel = item.stamp_number ? ` (nr. ${item.stamp_number})` : "";

    const subject = `Scan-anmodning: ${companyName}${stampLabel}`;
    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#1a1a2e">Scan-anmodning</h2>
        <p><strong>Lejer:</strong> ${companyName}</p>
        ${item.stamp_number ? `<p><strong>Nr.:</strong> ${item.stamp_number}</p>` : ""}
        <p><strong>Type:</strong> ${item.mail_type === "pakke" ? "Pakke" : "Brev"}</p>
        <p style="margin-top:16px;color:#666">En lejer har anmodet om scanning af ovenstående forsendelse.</p>
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
      template_name: "scan_request_notification",
      recipient_email: "kontakt@flexum.dk",
      status: "sent",
      metadata: { mail_item_id, company_name: companyName, stamp_number: item.stamp_number },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-scan-request error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
