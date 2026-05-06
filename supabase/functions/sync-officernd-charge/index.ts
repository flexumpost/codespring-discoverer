import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

async function getOfficeRndToken(clientId: string, clientSecret: string, orgSlug: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "flex.billing.charges.create flex.community.members.read flex.billing.plans.read",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch("https://identity.officernd.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OfficeRnD auth failed [${res.status}]: ${txt}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function findPlanId(apiBase: string, token: string, planName: string): Promise<string | null> {
  const res = await fetch(`${apiBase}/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`Failed to fetch fee plans: ${res.status}`);
    return null;
  }
  const plans = await res.json();
  console.log(`OfficeRnD fee plans (${plans.length}):`, JSON.stringify(plans.map((p: any) => ({ _id: p._id, name: p.name, price: p.price }))));
  const match = plans.find((p: any) => p.name === planName);
  if (match) {
    console.log(`Matched plan: ${match.name} (${match._id})`);
    return match._id;
  }
  console.warn(`No plan found matching name: "${planName}"`);
  return null;
}

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
      .select("id, mail_type, chosen_action, tenant_id, porto_option, tenants(contact_email, default_mail_action, default_package_action, tenant_type_id, tenant_types(name))")
      .eq("id", mailItemId)
      .single();
    if (itemErr || !item) throw new Error(`Mail item not found: ${itemErr?.message}`);

    const tenant = (item as any).tenants;
    if (!tenant?.contact_email) throw new Error("Tenant has no contact_email");

    const tierName = tenant.tenant_types?.name ?? null;
    const defaultAction = item.mail_type === "pakke" ? tenant.default_package_action : tenant.default_mail_action;

    const { amountKr, amountText } = calculateFee(item.mail_type, item.chosen_action, defaultAction, tierName);

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
    const token = await getOfficeRndToken(clientId, clientSecret, orgSlug);
    const apiBase = `https://app.officernd.com/api/v1/organizations/${orgSlug}`;

    // Find member by email
    const memberRes = await fetch(`${apiBase}/members?email=${encodeURIComponent(tenant.contact_email)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!memberRes.ok) {
      const txt = await memberRes.text();
      throw new Error(`OfficeRnD member lookup failed [${memberRes.status}]: ${txt}`);
    }
    const members = await memberRes.json();
    console.log(`OfficeRnD members for ${tenant.contact_email}:`, JSON.stringify(members.map((m: any) => ({ _id: m._id, name: m.name, team: m.team, office: m.office }))));
    if (!members.length) {
      throw new Error(`No OfficeRnD member found for email: ${tenant.contact_email}`);
    }

    const member = members.find((m: any) => m.team) || members[0];
    const memberId = member._id;
    const companyId = member.team || null;
    const memberOffice = member.office || null;
    const isPersonal = !companyId;

    if (!skippedMainFee) {
      // Find matching plan
      planName = getPlanName(item.mail_type, item.chosen_action, defaultAction, tierName);
      let planId: string | null = null;
      if (planName) {
        planId = await findPlanId(apiBase, token, planName);
      }

      // Build charge body
      const chargeBody: Record<string, unknown> = {
        price: amountKr,
        date: new Date().toISOString(),
        quantity: 1,
        isPersonal,
      };

      if (isPersonal) chargeBody.member = memberId;
      if (memberOffice) chargeBody.office = memberOffice;
      if (companyId) chargeBody.team = companyId;

      if (planId && planName) {
        chargeBody.plan = planId;
        chargeBody.name = planName;
        chargeBody.description = `[mail_item_id:${mailItemId}]`;
        console.log(`Using plan reference: ${planId} (${planName})`);
      } else {
        chargeBody.name = `Postgebyr: ${amountText} (${item.mail_type})`;
        chargeBody.description = `[mail_item_id:${mailItemId}]`;
        console.warn(`No plan ID found — creating custom one-off fee`);
      }

      console.log(`OfficeRnD charge body:`, JSON.stringify(chargeBody));

      // Create charge
      const chargeRes = await fetch(`${apiBase}/fees`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chargeBody),
      });
      if (!chargeRes.ok) {
        const txt = await chargeRes.text();
        throw new Error(`OfficeRnD charge creation failed [${chargeRes.status}]: ${txt}`);
      }
      const chargeRaw = await chargeRes.json();
      const charge = Array.isArray(chargeRaw) ? chargeRaw[0] : chargeRaw;
      console.log(`OfficeRnD charge response (raw):`, JSON.stringify(chargeRaw));
      console.log(`OfficeRnD charge parsed:`, JSON.stringify(charge));

      preliminaryChargeId = charge?._id || charge?.id || null;
      resolvedPlanType = charge.planType || "OneOff";
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
        const portoPlanId = await findPlanId(apiBase, token, portoInfo.planName);

        const portoBody: Record<string, unknown> = {
          price: portoInfo.amountKr,
          date: new Date().toISOString(),
          quantity: 1,
          isPersonal,
          description: `[mail_item_id:${mailItemId}] porto`,
        };

        if (isPersonal) portoBody.member = memberId;
        if (memberOffice) portoBody.office = memberOffice;
        if (companyId) portoBody.team = companyId;

        if (portoPlanId) {
          portoBody.plan = portoPlanId;
          portoBody.name = portoInfo.planName;
        } else {
          portoBody.name = `Porto: ${portoInfo.planName}`;
        }

        console.log(`Porto charge body:`, JSON.stringify(portoBody));

        const portoRes = await fetch(`${apiBase}/fees`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(portoBody),
        });

        if (!portoRes.ok) {
          const txt = await portoRes.text();
          throw new Error(`Porto charge failed [${portoRes.status}]: ${txt}`);
        }

        const portoRaw = await portoRes.json();
        const portoCharge = Array.isArray(portoRaw) ? portoRaw[0] : portoRaw;
        portoChargeId = portoCharge?._id || portoCharge?.id || null;

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
