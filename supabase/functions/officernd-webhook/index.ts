import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getInvoice,
  getMemberById,
  getOfficeRndToken,
  INVOICE_SCOPE,
  invoiceMemberId,
  invoiceRefId,
  invoiceTeamId,
  normalizeInvoiceStatus,
  TEAM_SCOPE,
  v2Base,
  type OfficeRndInvoice,
} from "../_shared/officernd.ts";
import {
  recomputeTenantFlag,
  resolveTenantIdsForInvoice,
  upsertInvoice,
} from "../_shared/invoice-flag.ts";


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

    const fee = payload.data?.object || payload.data || payload;
    const feeId = fee._id || fee.id;

    // --- Invoice events: drive the automatic "Ubetalt faktura" flag ---------
    const eventName = String(
      payload.event || payload.eventType || payload.type || payload.data?.eventType || "",
    ).toLowerCase();
    const looksLikeInvoice =
      eventName.includes("invoice") ||
      (!!fee?.status && (fee?.invoiceNumber || fee?.number || fee?.dueDate));

    if (looksLikeInvoice && feeId) {
      const result = await handleInvoiceEvent(supabase, fee as OfficeRndInvoice, eventName);
      return new Response(JSON.stringify({ success: true, kind: "invoice", ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    if (!feeId) {
      console.error("No fee ID in webhook payload");
      return new Response(JSON.stringify({ error: "No fee ID in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strategy 1: Match by charge_id (most reliable — set during sync)
    const { data: logByCharge } = await supabase
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

    // Strategy 2: Match by mail_item_id in description (fallback)
    const description = fee.description || fee.name || "";
    const mailItemMatch = description.match(/\[mail_item_id:([a-f0-9-]+)\]/i);

    if (mailItemMatch) {
      const mailItemId = mailItemMatch[1];
      console.log(`Matched mail_item_id from description: ${mailItemId}, fee_id: ${feeId}`);

      const { data: logEntry } = await supabase
        .from("officernd_sync_log")
        .select("id")
        .eq("mail_item_id", mailItemId)
        .eq("status", "pending_confirmation")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logEntry) {
        await supabase
          .from("officernd_sync_log")
          .update({ status: "confirmed", charge_id: feeId })
          .eq("id", logEntry.id);

        console.log(`Confirmed sync log ${logEntry.id} via mail_item_id match`);
        return new Response(JSON.stringify({ success: true, matched_by: "mail_item_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Strategy 3: Match by member_id (fallback when charge_id is null and description stripped)
    const feeMemberId = fee.member || fee.memberId || null;
    if (feeMemberId) {
      console.log(`Attempting member_id match: ${feeMemberId}`);
      const { data: logByMember } = await supabase
        .from("officernd_sync_log")
        .select("id")
        .eq("member_id", feeMemberId)
        .eq("status", "pending_confirmation")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logByMember) {
        await supabase
          .from("officernd_sync_log")
          .update({ status: "confirmed", charge_id: feeId })
          .eq("id", logByMember.id);

        console.log(`Confirmed sync log ${logByMember.id} via member_id match`);
        return new Response(JSON.stringify({ success: true, matched_by: "member_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.warn("Could not match webhook to any sync log entry", { feeId, feeMemberId });
    return new Response(JSON.stringify({ warning: "No matching sync log found" }), {
      status: 200,
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

/**
 * Handle an OfficeRnD invoice event: store the invoice, resolve the tenant and
 * recompute the "Ubetalt faktura" flag.
 */
async function handleInvoiceEvent(
  supabase: any,
  invoiceIn: OfficeRndInvoice,
  eventName: string,
): Promise<Record<string, unknown>> {
  const invoiceId = invoiceRefId(invoiceIn)!;
  let invoice = invoiceIn;
  let memberEmail: string | null =
    (typeof invoiceIn.member === "object" ? (invoiceIn.member as any)?.email : null) ?? null;

  // Enrich from the API when possible (webhook payloads are often partial).
  const clientId = Deno.env.get("OFFICERND_CLIENT_ID");
  const clientSecret = Deno.env.get("OFFICERND_CLIENT_SECRET");
  const { data: settings } = await supabase
    .from("officernd_settings")
    .select("enabled, org_slug")
    .eq("id", 1)
    .maybeSingle();
  const orgSlug = settings?.org_slug || Deno.env.get("OFFICERND_ORG_SLUG");

  let memberId = invoiceMemberId(invoiceIn);
  let apiBase: string | null = null;
  let token: string | null = null;

  if (clientId && clientSecret && orgSlug) {
    try {
      token = await getOfficeRndToken({ clientId, clientSecret, orgSlug }, [
        INVOICE_SCOPE,
        TEAM_SCOPE,
      ]);
      apiBase = v2Base(orgSlug);
      const full = await getInvoice(apiBase, token, invoiceId);
      if (full) {
        invoice = full;
        memberId = invoiceMemberId(full) ?? memberId;
      }
      if (!memberEmail && memberId) {
        const member = await getMemberById(apiBase, token, memberId);
        memberEmail = (member?.email as string) ?? null;
      }
    } catch (e) {
      console.warn("Invoice enrichment failed:", e instanceof Error ? e.message : String(e));
      // Retry without the team scope in case the app lacks it.
      if (!token) {
        try {
          token = await getOfficeRndToken({ clientId, clientSecret, orgSlug }, [INVOICE_SCOPE]);
          apiBase = v2Base(orgSlug);
          const full = await getInvoice(apiBase, token, invoiceId);
          if (full) {
            invoice = full;
            memberId = invoiceMemberId(full) ?? memberId;
          }
        } catch (e2) {
          console.warn("Invoice enrichment retry failed:", e2 instanceof Error ? e2.message : String(e2));
        }
      }
    }
  }

  const status = normalizeInvoiceStatus(invoice.status ?? eventName.split(".").pop());
  const teamId = invoiceTeamId(invoice) ?? invoiceTeamId(invoiceIn);
  const { tenantIds, matchedBy } = await resolveTenantIdsForInvoice(supabase, {
    memberEmail,
    teamId,
    apiBase,
    token,
  });
  const tenantId = tenantIds[0] ?? null;

  const oldStatus = await upsertInvoice(supabase, {
    invoiceId,
    tenantId,
    memberId,
    memberEmail,
    teamId,
    status,
    amount: (invoice.total ?? invoice.amount ?? null) as number | null,
    dueDate: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : null,
    raw: invoice,
  });

  if (!tenantId) {
    console.warn(
      `Invoice ${invoiceId}: no tenant matched (member=${memberEmail ?? "-"}, team=${teamId ?? "-"})`,
    );
    return { invoice_id: invoiceId, status, matched_tenant: false };
  }

  const flag = await recomputeTenantFlag(supabase, tenantId, {
    invoiceId,
    oldStatus,
    newStatus: status,
    source: "webhook",
    note: [eventName || null, matchedBy ? `match: ${matchedBy}` : null].filter(Boolean).join(" · ") || null,
  });

  return { invoice_id: invoiceId, status, tenant_id: tenantId, has_unpaid_invoice: flag };
}
