import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createFee,
  findItemByName,
  findMembersByEmail,
  getOfficeRndToken,
  v2Base,
} from "../_shared/officernd.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Returnerer [start, end) ISO-strenge der dækker "i dag" i Europe/Copenhagen,
// beregnet i UTC. Håndterer sommertid (+01:00 / +02:00).
/** True hvis datoen er lejerens standard-afhentningsdag (Lite: 1. torsdag i mdr., Standard/Plus: torsdag). */
function isStandardPickupDay(tier: string | null, when: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(when);
  const day = Number(parts.find(p => p.type === "day")!.value);
  const weekday = parts.find(p => p.type === "weekday")!.value;
  if (weekday !== "Thu") return false;
  if (tier === "Lite") return day <= 7;
  return true;
}

function copenhagenDayBoundsUtc(): [string, string] {
  const now = new Date();
  const dParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const y = Number(dParts.find(p => p.type === "year")!.value);
  const m = Number(dParts.find(p => p.type === "month")!.value);
  const d = Number(dParts.find(p => p.type === "day")!.value);
  // Bestem Copenhagens UTC-offset for denne dag (1 eller 2 timer)
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const localHourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen", hour: "2-digit", hour12: false,
  }).format(noonUtc);
  const offsetHours = parseInt(localHourStr, 10) - 12;
  const start = new Date(Date.UTC(y, m - 1, d, -offsetHours, 0, 0)).toISOString();
  const end = new Date(Date.UTC(y, m - 1, d + 1, -offsetHours, 0, 0)).toISOString();
  return [start, end];
}



// Fee calculation logic (mirrors frontend getShippingFee)
function calculateFee(
  mailType: string,
  chosenAction: string | null,
  defaultAction: string | null,
  tierName: string | null
): { amountKr: number; amountText: string } {
  const tier = tierName ?? "";

  // Normalize operator action names to fee-equivalent names
  if (chosenAction === "under_forsendelse") chosenAction = "send";
  if (chosenAction === "afhentet") chosenAction = "afhentning";

  // No chosen action → use default action
  if (!chosenAction) {
    if (!defaultAction) return { amountKr: 0, amountText: "0 kr." };
    if (mailType === "pakke") {
      if (defaultAction === "afhentning") {
        if (tier === "Plus") return { amountKr: 10, amountText: "10 kr." };
        if (tier === "Standard") return { amountKr: 30, amountText: "30 kr." };
        return { amountKr: 50, amountText: "50 kr." };
      }
      if (defaultAction === "send") {
        if (tier === "Plus") return { amountKr: 10, amountText: "10 kr. + porto" };
        if (tier === "Standard") return { amountKr: 30, amountText: "30 kr. + porto" };
        return { amountKr: 50, amountText: "50 kr. + porto" };
      }
      if (defaultAction === "destruer") return { amountKr: 0, amountText: "0 kr." };
      return { amountKr: 0, amountText: "0 kr." };
    }
    // brev default
    if (defaultAction === "send" || defaultAction === "forsendelse") {
      if (tier === "Lite" || tier === "Standard") return { amountKr: 0, amountText: "0 kr. + porto" };
      return { amountKr: 0, amountText: "0 kr." };
    }
    return { amountKr: 0, amountText: "0 kr." };
  }

  if (chosenAction === "standard_forsendelse") {
    if (mailType === "pakke") {
      if (tier === "Plus") return { amountKr: 10, amountText: "10 kr. + porto" };
      if (tier === "Standard") return { amountKr: 30, amountText: "30 kr. + porto" };
      return { amountKr: 50, amountText: "50 kr. + porto" };
    }
    return { amountKr: 0, amountText: "0 kr. + porto" };
  }
  if (chosenAction === "standard_scan") return { amountKr: 0, amountText: "0 kr." };
  if (chosenAction === "gratis_afhentning") return { amountKr: 0, amountText: "0 kr." };

  if (mailType === "pakke") {
    if (chosenAction === "destruer") return { amountKr: 0, amountText: "0 kr." };
    if (chosenAction === "afhentning") {
      if (tier === "Plus") return { amountKr: 10, amountText: "10 kr." };
      if (tier === "Standard") return { amountKr: 30, amountText: "30 kr." };
      return { amountKr: 50, amountText: "50 kr." };
    }
    // send pakke
    if (tier === "Plus") return { amountKr: 10, amountText: "10 kr. + porto" };
    if (tier === "Standard") return { amountKr: 30, amountText: "30 kr. + porto" };
    return { amountKr: 50, amountText: "50 kr. + porto" };
  }

  // brev with explicit chosen_action
  if (chosenAction === "send" || chosenAction === "forsendelse") {
    // Standard-forsendelsesdag (gratis) for Lite og Standard når brugeren sender på sin default-handling
    if (chosenAction === defaultAction) {
      if (tier === "Lite" || tier === "Standard") return { amountKr: 0, amountText: "0 kr. + porto" };
      return { amountKr: 0, amountText: "0 kr." };
    }
    if (tier === "Lite") return { amountKr: 50, amountText: "50 kr. + porto" };
    if (tier === "Standard") return { amountKr: 0, amountText: "0 kr. + porto" };
    return { amountKr: 0, amountText: "0 kr." };
  }
  if (chosenAction === "scan") {
    if (tier === "Plus") return { amountKr: 0, amountText: "0 kr." };
    if (tier === "Standard") return { amountKr: 30, amountText: "30 kr." };
    return { amountKr: 50, amountText: "50 kr." };
  }
  if (chosenAction === "afhentning") {
    if (tier === "Plus") return { amountKr: 0, amountText: "0 kr." };
    if (tier === "Standard") return { amountKr: 30, amountText: "30 kr." };
    return { amountKr: 50, amountText: "50 kr." };
  }

  return { amountKr: 0, amountText: "0 kr." };
}

// Porto fee mapping
const PORTO_MAP: Record<string, { planName: string; amountKr: number }> = {
  dk_0_100: { planName: 'DAO Porto Danmark (0 - 100 g.) kr. 18,4', amountKr: 18.40 },
  dk_100_250: { planName: 'DAO Porto Danmark (100 - 250 g.) kr. 36,8', amountKr: 36.80 },
  dk_250_500: { planName: 'DAO Porto Danmark (250 - 500 g.) kr. 54', amountKr: 54.00 },
  dk_500_1500: { planName: 'DAO Porto Danmark (500 - 1500 g.) kr. 72', amountKr: 72.00 },
  udland_0_100: { planName: 'DAO Porto Udland (0 - 100 g.) kr. 46', amountKr: 46.00 },
  udland_100_250: { planName: 'DAO Porto Udland (100 - 250 g.) kr. 92', amountKr: 92.00 },
  dk_pakke_0_1: { planName: 'Pakke porto (0 - 1 kg.) á kr. 48,00', amountKr: 48.00 },
  dk_pakke_1_2: { planName: 'Pakke porto (1- 2 kg.) á kr. 57,60', amountKr: 57.60 },
  dk_pakke_2_5: { planName: 'Pakke porto (2 - 5 kg.) á kr. 77,60', amountKr: 77.60 },
  dk_pakke_5_10: { planName: 'Pakke porto (5 - 10 kg.) á kr. 101,60', amountKr: 101.60 },
  dk_pakke_10_15: { planName: 'Pakke porto (10 - 15 kg.) á kr. 133,60', amountKr: 133.60 },
  dk_pakke_15_20: { planName: 'Pakke porto (15 - 20 kg.) á kr. 141,60', amountKr: 141.60 },
};

// Determine the OfficeRnD plan name based on mail type, action, and tier
function getPlanName(
  mailType: string,
  chosenAction: string | null,
  defaultAction: string | null,
  tierName: string | null
): string | null {
  const tier = tierName ?? "Lite";
  // Determine effective action
  let action = chosenAction;
  if (action === "under_forsendelse" || action === "standard_forsendelse") action = "send";
  if (action === "afhentet") action = "afhentning";
  if (!action) action = defaultAction;
  if (!action) return null;

  if (mailType === "pakke") {
    if (action === "afhentning") return `Brev/pakke afhentning (${tier})`;
    if (action === "send" || action === "forsendelse") return `Pakke forsendelse (${tier})`;
    return null;
  }

  // brev
  if (action === "afhentning") return `Brev/pakke afhentning (${tier})`;
  if (action === "scan") return `Scanning af brev (${tier})`;
  if (action === "send" || action === "forsendelse") return `Brev forsendelse (${tier})`;
  return null;
}

// OfficeRnD v2 helpers live in ../_shared/officernd.ts


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("OFFICERND_CLIENT_ID");
  const clientSecret = Deno.env.get("OFFICERND_CLIENT_SECRET");
  const orgSlugEnv = Deno.env.get("OFFICERND_ORG_SLUG");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let mailItemId: string | null = null;
  let pendingLogId: string | null = null;

  try {
    const body = await req.json();
    mailItemId = body.mail_item_id;
    if (!mailItemId) throw new Error("mail_item_id required");

    // Check idempotency — skip if already confirmed or pending confirmation
    const { data: existing } = await supabase
      .from("officernd_sync_log")
      .select("id, status, charge_id")
      .eq("mail_item_id", mailItemId)
      .in("status", ["confirmed", "pending_confirmation"])
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ skipped: true, reason: `already ${existing.status}`, charge_id: existing.charge_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get settings (org_slug can come from settings or env)
    const { data: settings } = await supabase
      .from("officernd_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (!settings?.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "integration disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgSlug = settings.org_slug || orgSlugEnv;
    if (!clientId || !clientSecret || !orgSlug) {
      throw new Error("Missing OfficeRnD credentials (client_id, client_secret, or org_slug)");
    }

    // Fetch mail item with tenant info
    const { data: item, error: itemErr } = await supabase
      .from("mail_items")
      .select("id, mail_type, chosen_action, tenant_id, porto_option, stamp_number, pickup_date, tenants(company_name, contact_email, billed_by_email, billed_by_company, default_mail_action, default_package_action, tenant_type_id, tenant_types(name))")
      .eq("id", mailItemId)
      .single();
    if (itemErr || !item) throw new Error(`Mail item not found: ${itemErr?.message}`);

    const tenant = (item as any).tenants;
    const billedByEmail: string | null = tenant?.billed_by_email || null;
    const tenantCompanyName: string | null = tenant?.company_name || null;

    // Build candidate emails. If billed_by_email is set, ONLY use that.
    const candidateEmails: string[] = [];
    if (billedByEmail) {
      candidateEmails.push(billedByEmail);
    } else {
      if (tenant?.contact_email) candidateEmails.push(tenant.contact_email);
      const { data: tuRows } = await supabase
        .from("tenant_users")
        .select("user_id")
        .eq("tenant_id", item.tenant_id);
      const userIds = ((tuRows ?? []) as any[]).map((r) => r.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("email")
          .in("id", userIds);
        for (const p of (profs ?? []) as any[]) {
          if (p?.email && !candidateEmails.includes(p.email)) candidateEmails.push(p.email);
        }
      }
    }
    if (candidateEmails.length === 0) throw new Error("Tenant has no contact_email");

    const tierName = tenant.tenant_types?.name ?? null;
    const defaultAction = item.mail_type === "pakke" ? tenant.default_package_action : tenant.default_mail_action;

    let { amountKr, amountText } = calculateFee(item.mail_type, item.chosen_action, defaultAction, tierName);

    // Gratis afhentning: breve afhentet på lejerens standard-afhentningsdag koster 0 kr.,
    // også når handlingen er registreret manuelt som "afhentning"/"afhentet".
    const isPickupAction = item.chosen_action === "afhentning" || item.chosen_action === "afhentet";
    if (item.mail_type !== "pakke" && isPickupAction && amountKr > 0) {
      const when = (item as any).pickup_date ? new Date((item as any).pickup_date) : new Date();
      if (isStandardPickupDay(tierName, when)) {
        console.log(`Afhentning på standarddag (${tierName}) — gebyr sat til 0 kr. for ${mailItemId}`);
        amountKr = 0;
        amountText = "0 kr.";
      }
    }

    // Consolidér afhentningsgebyr: ét gebyr pr. lejer pr. dag (Europe/Copenhagen).
    // Hvis en anden afhentning allerede er faktureret i dag for samme lejer, spring
    // hovedgebyret over og log som "skipped_grouped_pickup". Porto er 0 for afhentning.
    const effectiveAction = (item.chosen_action === "afhentet" || item.chosen_action === "afhentning") ? "afhentning" : null;
    if (effectiveAction === "afhentning" && amountKr > 0) {
      const [startIso, endIso] = copenhagenDayBoundsUtc();
      const { data: sameDay } = await supabase
        .from("officernd_sync_log")
        .select("id, mail_items!inner(tenant_id)")
        .eq("mail_items.tenant_id", item.tenant_id)
        .ilike("plan_name", "Brev/pakke afhentning%")
        .in("status", ["confirmed", "pending_confirmation"])
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .limit(1);
      if (sameDay && sameDay.length > 0) {
        await supabase.from("officernd_sync_log").insert({
          mail_item_id: mailItemId,
          status: "skipped_grouped_pickup",
          charge_id: "skipped_grouped_pickup",
          amount_text: "0 kr. (samlet afhentning)",
          plan_name: `Brev/pakke afhentning (${tierName ?? "Lite"})`,
        });
        console.log(`Skipping main fee: tenant ${item.tenant_id} already has an afhentning charge today.`);
        return new Response(
          JSON.stringify({ success: true, skipped_main: true, status: "skipped_grouped_pickup" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }


    // Insert pending log
    const { data: logRow } = await supabase
      .from("officernd_sync_log")
      .insert({ mail_item_id: mailItemId, amount_text: amountText, status: "pending" })
      .select("id")
      .single();
    pendingLogId = logRow?.id ?? null;

    let preliminaryChargeId: string | null = null;
    let planName: string | null = null;
    let resolvedPlanType = "OneOff";
    let skippedMainFee = false;

    // Skip main charge if fee is 0
    if (amountKr === 0) {
      await supabase
        .from("officernd_sync_log")
        .update({ status: "skipped_zero_fee", charge_id: "skipped_zero_fee" })
        .eq("id", pendingLogId!);
      skippedMainFee = true;
      console.log(`Main fee is 0 kr — skipping OfficeRnD charge creation, proceeding to porto check.`);
    }

    // We need OfficeRnD token & member for both main charge and porto
    const token = await getOfficeRndToken({ clientId, clientSecret, orgSlug });
    const apiBase = v2Base(orgSlug);

    // Find member by email — try each candidate until match
    let members: any[] = [];
    let matchedEmail: string | null = null;
    let lastLookupError: string | null = null;
    for (const email of candidateEmails) {
      try {
        const found = await findMembersByEmail(apiBase, token, email);
        if (found.length > 0) {
          members = found;
          matchedEmail = email;
          break;
        }
      } catch (e) {
        lastLookupError = e instanceof Error ? e.message : String(e);
        console.error(lastLookupError);
      }
    }
    console.log(`OfficeRnD members lookup tried: ${candidateEmails.join(", ")}; matched: ${matchedEmail ?? "none"}`);
    if (!members.length) {
      throw new Error(lastLookupError ?? `No OfficeRnD member found for any of: ${candidateEmails.join(", ")}`);
    }
    if (matchedEmail && matchedEmail !== tenant?.contact_email) {
      console.log(`Matched OfficeRnD member via secondary email ${matchedEmail} (contact_email was ${tenant?.contact_email})`);
    }

    const member = members.find((m: any) => m.team) || members[0];
    const memberId = member._id;
    const companyId = member.team || null;
    const memberOffice = member.office || null;
    const isPersonal = !companyId;

    const _d = new Date();
    const dateLabel = `${String(_d.getDate()).padStart(2,'0')}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getFullYear()).slice(-2)}`;
    const stampLabel = item.stamp_number ? ` (${item.stamp_number})` : "";
    const tenantLabel = billedByEmail && tenantCompanyName ? ` (${tenantCompanyName})` : "";

    if (!skippedMainFee) {
      planName = getPlanName(item.mail_type, item.chosen_action, defaultAction, tierName);
      const matchedItem = planName ? await findItemByName(apiBase, token, planName) : null;

      const fee = await createFee(apiBase, token, {
        member: memberId,
        team: companyId,
        office: memberOffice,
        isPersonal,
        price: amountKr,
        quantity: 1,
        name: matchedItem && planName
          ? `${planName}${tenantLabel} - ${dateLabel}${stampLabel}`
          : `Postgebyr: ${amountText} (${item.mail_type})${tenantLabel} - ${dateLabel}${stampLabel}`,
        description: `[mail_item_id:${mailItemId}]`,
        item: matchedItem,
      });

      preliminaryChargeId = fee.id;
      resolvedPlanType = fee.planType;
      await supabase
        .from("officernd_sync_log")
        .update({
          status: "pending_confirmation",
          charge_id: preliminaryChargeId,
          plan_name: planName,
          plan_type: resolvedPlanType,
          member_id: memberId,
        } as any)
        .eq("id", pendingLogId!);
    }

    // --- Porto charge (separate fee) ---
    let portoChargeId: string | null = null;
    const portoOption = (item as any).porto_option as string | null;
    const portoInfo = portoOption ? PORTO_MAP[portoOption] : null;

    const isPackagePorto = portoOption ? portoOption.startsWith("dk_pakke_") : false;
    if (portoInfo && tierName && (isPackagePorto || tierName !== "Plus")) {
      console.log(`Creating porto charge: ${portoInfo.planName} (${portoInfo.amountKr} kr.)`);

      const portoLogRes = await supabase
        .from("officernd_sync_log")
        .insert({ mail_item_id: mailItemId, amount_text: `${portoInfo.amountKr} kr.`, status: "pending", plan_name: portoInfo.planName })
        .select("id")
        .single();
      const portoLogId = portoLogRes.data?.id ?? null;

      try {
        const portoItem = await findItemByName(apiBase, token, portoInfo.planName);
        const portoFee = await createFee(apiBase, token, {
          member: memberId,
          team: companyId,
          office: memberOffice,
          isPersonal,
          price: portoInfo.amountKr,
          quantity: 1,
          name: portoItem
            ? `${portoInfo.planName}${tenantLabel} - ${dateLabel}${stampLabel}`
            : `Porto: ${portoInfo.planName}${tenantLabel} - ${dateLabel}${stampLabel}`,
          description: `[mail_item_id:${mailItemId}] porto`,
          item: portoItem,
        });
        portoChargeId = portoFee.id;

        if (portoLogId) {
          await supabase
            .from("officernd_sync_log")
            .update({ status: "pending_confirmation", charge_id: portoChargeId, member_id: memberId, plan_type: "OneOff" } as any)
            .eq("id", portoLogId);
        }
        console.log(`Porto charge created: ${portoChargeId}`);
      } catch (portoErr) {
        console.error("Porto charge error:", portoErr);
        if (portoLogId) {
          await supabase
            .from("officernd_sync_log")
            .update({ status: "failed", error_message: portoErr instanceof Error ? portoErr.message : String(portoErr) })
            .eq("id", portoLogId);
        }
      }
    }


    return new Response(JSON.stringify({ success: true, skipped_main: skippedMainFee, status: skippedMainFee ? "skipped_zero_fee" : "pending_confirmation", charge_id: preliminaryChargeId, plan: planName, porto_charge_id: portoChargeId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-officernd-charge error:", err);

    const errorMessage = err instanceof Error ? err.message : String(err);

    // Update existing pending log or insert new error log
    try {
      if (pendingLogId) {
        await supabase
          .from("officernd_sync_log")
          .update({ status: "failed", error_message: errorMessage })
          .eq("id", pendingLogId);
      } else if (mailItemId) {
        await supabase
          .from("officernd_sync_log")
          .insert({ mail_item_id: mailItemId, status: "failed", error_message: errorMessage });
      }
    } catch { /* ignore logging errors */ }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
