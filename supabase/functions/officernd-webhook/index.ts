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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const webhookSecret = Deno.env.get("OFFICERND_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("OFFICERND_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate webhook secret via X-Webhook-Secret header or query param
  const providedSecret =
    req.headers.get("x-webhook-secret") ||
    new URL(req.url).searchParams.get("secret");

  if (providedSecret !== webhookSecret) {
    console.error("Invalid webhook secret");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload = await req.json();
    console.log("Webhook payload received:", JSON.stringify(payload));

    // OfficeRnD webhook: payload structure is { data: { object: { ... } } }
    const fee = payload.data?.object || payload.data || payload;
    const feeId = fee._id || fee.id;
    const description = fee.description || fee.name || "";

    if (!feeId) {
      console.error("No fee ID in webhook payload");
      return new Response(JSON.stringify({ error: "No fee ID in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract mail_item_id from description: [mail_item_id:UUID]
    const mailItemMatch = description.match(/\[mail_item_id:([a-f0-9-]+)\]/i);

    if (!mailItemMatch) {
      console.warn("No mail_item_id found in fee description, trying charge_id match");
      // Fallback: try to match by existing pending charge_id
      const { data: logByCharge, error: logErr } = await supabase
        .from("officernd_sync_log")
        .select("id")
        .eq("charge_id", feeId)
        .eq("status", "pending_confirmation")
        .maybeSingle();

      if (logByCharge) {
        await supabase
          .from("officernd_sync_log")
          .update({ status: "confirmed", charge_id: feeId })
          .eq("id", logByCharge.id);

        console.log(`Confirmed sync log ${logByCharge.id} via charge_id match`);
        return new Response(JSON.stringify({ success: true, matched_by: "charge_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.warn("Could not match webhook to any sync log entry");
      return new Response(JSON.stringify({ warning: "No matching sync log found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mailItemId = mailItemMatch[1];
    console.log(`Matched mail_item_id: ${mailItemId}, fee_id: ${feeId}`);

    // Find the most recent pending_confirmation entry for this mail_item
    const { data: logEntry, error: logErr } = await supabase
      .from("officernd_sync_log")
      .select("id")
      .eq("mail_item_id", mailItemId)
      .eq("status", "pending_confirmation")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!logEntry) {
      console.warn(`No pending_confirmation log for mail_item ${mailItemId}`);
      return new Response(JSON.stringify({ warning: "No pending log found for mail_item" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update to confirmed
    await supabase
      .from("officernd_sync_log")
      .update({ status: "confirmed", charge_id: feeId })
      .eq("id", logEntry.id);

    console.log(`Confirmed sync log ${logEntry.id} for mail_item ${mailItemId}`);

    return new Response(JSON.stringify({ success: true, confirmed_log_id: logEntry.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
