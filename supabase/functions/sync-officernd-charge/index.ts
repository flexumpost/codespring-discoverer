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
      .select("id, mail_type, chosen_action, tenant_id, tenants(contact_email, default_mail_action, default_package_action, tenant_type_id, tenant_types(name))")
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

    // Skip if fee is 0 and no porto
    if (amountKr === 0 && !amountText.includes("porto")) {
      await supabase
        .from("officernd_sync_log")
        .update({ status: "success", charge_id: "skipped_zero_fee" })
        .eq("id", pendingLogId!);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "zero fee" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OfficeRnD token
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
    // Prioritize member with team (organization) over personal profile
    const teamMember = members.find((m: any) => m.team);
    const member = teamMember || members[0];
    console.log(`Selected member: ${member.name} (team: ${member.team || 'none'}, id: ${member._id})`);
    const memberId = member._id;
    const memberOffice = member.office;

    // Determine plan name and look up plan ID
    const planName = getPlanName(item.mail_type, item.chosen_action, defaultAction, tierName);
    console.log(`Determined plan name: "${planName}" (mailType=${item.mail_type}, action=${item.chosen_action}, default=${defaultAction}, tier=${tierName})`);

    let planId: string | null = null;
    if (planName) {
      planId = await findPlanId(apiBase, token, planName);
    }

    // Build charge body — when a plan is matched, use plan name and let OfficeRnD
    // display it properly under One-Off Fees. Keep mail_item_id in description only.
    const chargeBody: Record<string, unknown> = {
      member: memberId,
      office: memberOffice,
      price: amountKr,
      date: new Date().toISOString(),
    };

    let resolvedPlanType = "OneOff";

    if (planId && planName) {
      // Use the plan reference — OfficeRnD will use the plan's name for display
      chargeBody.plan = planId;
      // description keeps mail_item_id for webhook matching
      chargeBody.description = `[mail_item_id:${mailItemId}]`;
      resolvedPlanType = "OneOff";
      console.log(`Using plan reference: ${planId} (${planName})`);
    } else {
      // Fallback: no matching plan, create as custom one-off fee
      chargeBody.name = `Postgebyr: ${amountText} (${item.mail_type})`;
      chargeBody.description = `[mail_item_id:${mailItemId}]`;
      resolvedPlanType = "OneOff";
      console.warn(`No plan ID found — creating custom one-off fee`);
    }

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
    const charge = await chargeRes.json();
    console.log(`OfficeRnD charge response:`, JSON.stringify(charge));

    // Update log as pending_confirmation with debug info
    const preliminaryChargeId = charge._id || charge.id || null;
    await supabase
      .from("officernd_sync_log")
      .update({
        status: "pending_confirmation",
        charge_id: preliminaryChargeId,
        plan_name: planName,
        plan_type: charge.planType || resolvedPlanType,
        member_id: memberId,
      } as any)
      .eq("id", pendingLogId!);

    return new Response(JSON.stringify({ success: true, status: "pending_confirmation", charge_id: preliminaryChargeId, plan: planName, planType: charge.planType }), {
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
