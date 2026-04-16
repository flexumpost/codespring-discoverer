import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Fee calculation logic (mirrors sync-officernd-charge)
function calculateFee(
  mailType: string,
  chosenAction: string | null,
  defaultAction: string | null,
  tierName: string | null
): { amountKr: number; amountText: string } {
  const tier = tierName ?? "";
  if (chosenAction === "under_forsendelse") chosenAction = "send";
  if (chosenAction === "afhentet") chosenAction = "afhentning";

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
    if (tier === "Plus") return { amountKr: 10, amountText: "10 kr. + porto" };
    if (tier === "Standard") return { amountKr: 30, amountText: "30 kr. + porto" };
    return { amountKr: 50, amountText: "50 kr. + porto" };
  }

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

function getPlanName(
  mailType: string,
  chosenAction: string | null,
  defaultAction: string | null,
  tierName: string | null
): string | null {
  const tier = tierName ?? "Lite";
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
  if (action === "afhentning") return `Brev/pakke afhentning (${tier})`;
  if (action === "scan") return `Scanning af brev (${tier})`;
  if (action === "send" || action === "forsendelse") return `Brev forsendelse (${tier})`;
  return null;
}

async function getOfficeRndToken(clientId: string, clientSecret: string): Promise<string> {
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
  if (!res.ok) return null;
  const plans = await res.json();
  const match = plans.find((p: any) => p.name === planName);
  return match?._id ?? null;
}

interface ItemData {
  id: string;
  mail_type: string;
  chosen_action: string | null;
  porto_option: string | null;
  stamp_number: number | null;
  tenant_id: string;
  contact_email: string;
  tier_name: string;
  default_action: string | null;
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

  try {
    const body = await req.json();
    const mailItemIds: string[] = body.mail_item_ids;
    if (!Array.isArray(mailItemIds) || mailItemIds.length === 0) {
      return new Response(JSON.stringify({ error: "mail_item_ids array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if integration is enabled
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
      throw new Error("Missing OfficeRnD credentials");
    }

    // Fetch all mail items with tenant info
    const { data: rawItems, error: itemsErr } = await supabase
      .from("mail_items")
      .select("id, mail_type, chosen_action, tenant_id, porto_option, stamp_number, tenants(contact_email, default_mail_action, default_package_action, tenant_type_id, tenant_types(name))")
      .in("id", mailItemIds);

    if (itemsErr) throw new Error(`Failed to fetch items: ${itemsErr.message}`);
    if (!rawItems?.length) throw new Error("No items found");

    const items: ItemData[] = rawItems.map((item: any) => ({
      id: item.id,
      mail_type: item.mail_type,
      chosen_action: item.chosen_action,
      porto_option: item.porto_option,
      stamp_number: item.stamp_number,
      tenant_id: item.tenant_id,
      contact_email: item.tenants?.contact_email ?? null,
      tier_name: item.tenants?.tenant_types?.name ?? "Lite",
      default_action: item.mail_type === "pakke"
        ? item.tenants?.default_package_action
        : item.tenants?.default_mail_action,
    }));

    // Group by tenant_id
    const byTenant = new Map<string, ItemData[]>();
    for (const item of items) {
      if (!byTenant.has(item.tenant_id)) byTenant.set(item.tenant_id, []);
      byTenant.get(item.tenant_id)!.push(item);
    }

    // Get OfficeRnD token
    const token = await getOfficeRndToken(clientId, clientSecret);
    const apiBase = `https://app.officernd.com/api/v1/organizations/${orgSlug}`;

    const results: any[] = [];

    for (const [tenantId, tenantItems] of byTenant) {
      const firstItem = tenantItems[0];
      if (!firstItem.contact_email) {
        console.error(`Tenant ${tenantId} has no contact_email, skipping`);
        for (const it of tenantItems) {
          await supabase.from("officernd_sync_log").insert({
            mail_item_id: it.id,
            status: "failed",
            error_message: `Tenant has no contact_email`,
            amount_text: null,
          });
        }
        continue;
      }

      // Find OfficeRnD member
      const memberRes = await fetch(
        `${apiBase}/members?email=${encodeURIComponent(firstItem.contact_email)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let members: any[] = [];
      if (!memberRes.ok) {
        const txt = await memberRes.text();
        console.error(`Member lookup failed for ${firstItem.contact_email}: ${txt}`);
        for (const it of tenantItems) {
          await supabase.from("officernd_sync_log").insert({
            mail_item_id: it.id,
            status: "failed",
            error_message: `Member lookup failed for ${firstItem.contact_email}: ${txt}`,
            amount_text: null,
          });
        }
        continue;
      } else {
        members = await memberRes.json();
      }
      if (!members.length) {
        console.error(`No OfficeRnD member for ${firstItem.contact_email}`);
        for (const it of tenantItems) {
          await supabase.from("officernd_sync_log").insert({
            mail_item_id: it.id,
            status: "failed",
            error_message: `No OfficeRnD member found for ${firstItem.contact_email}`,
            amount_text: null,
          });
        }
        continue;
      }

      const member = members.find((m: any) => m.team) || members[0];
      const memberId = member._id;
      const companyId = member.team || null;
      const memberOffice = member.office || null;
      const isPersonal = !companyId;

      // Calculate consolidated main fee
      const fees = tenantItems.map((it) => calculateFee(it.mail_type, it.chosen_action, it.default_action, it.tier_name));
      const totalMainFee = fees.reduce((sum, f) => sum + f.amountKr, 0);
      const stampNumbers = tenantItems
        .map((it) => it.stamp_number)
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);
      const stampText = stampNumbers.length > 0 ? ` (nr. ${stampNumbers.join(", ")})` : "";

      const planName = getPlanName(firstItem.mail_type, firstItem.chosen_action, firstItem.default_action, firstItem.tier_name);
      const quantity = tenantItems.length;

      // Create consolidated main charge
      if (totalMainFee > 0 && planName) {
        // Check idempotency for all items
        const { data: existing } = await supabase
          .from("officernd_sync_log")
          .select("id, mail_item_id")
          .in("mail_item_id", tenantItems.map((i) => i.id))
          .in("status", ["confirmed", "pending_confirmation"]);

        const alreadySynced = new Set((existing ?? []).map((e: any) => e.mail_item_id));
        const toSync = tenantItems.filter((i) => !alreadySynced.has(i.id));

        if (toSync.length === 0) {
          results.push({ tenant_id: tenantId, skipped: true, reason: "all already synced" });
          continue;
        }

        const planId = await findPlanId(apiBase, token, planName);

        const chargeBody: Record<string, unknown> = {
          price: fees[0].amountKr, // price per unit
          date: new Date().toISOString(),
          quantity: toSync.length,
          isPersonal,
        };

        if (isPersonal) chargeBody.member = memberId;
        if (memberOffice) chargeBody.office = memberOffice;
        if (companyId) chargeBody.team = companyId;

        const itemIds = toSync.map((i) => i.id);
        if (planId) {
          chargeBody.plan = planId;
          chargeBody.name = planName;
        } else {
          chargeBody.name = `${planName}`;
        }
        chargeBody.description = `${planName} x${toSync.length}${stampText} [mail_item_ids:${itemIds.join(",")}]`;

        console.log(`Batch charge for tenant ${tenantId}:`, JSON.stringify(chargeBody));

        const chargeRes = await fetch(`${apiBase}/fees`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(chargeBody),
        });

        if (!chargeRes.ok) {
          const txt = await chargeRes.text();
          console.error(`Charge creation failed for tenant ${tenantId}: ${txt}`);
          // Log failure for each item
          for (const it of toSync) {
            await supabase.from("officernd_sync_log").insert({
              mail_item_id: it.id,
              status: "failed",
              error_message: `Batch charge failed: ${txt}`,
              amount_text: fees[0].amountText,
            });
          }
          continue;
        }

        const chargeRaw = await chargeRes.json();
        const charge = Array.isArray(chargeRaw) ? chargeRaw[0] : chargeRaw;
        const chargeId = charge?._id || charge?.id || null;
        const resolvedPlanType = charge?.planType || "OneOff";

        // Log for each item in the batch
        for (const it of toSync) {
          await supabase.from("officernd_sync_log").insert({
            mail_item_id: it.id,
            status: "pending_confirmation",
            charge_id: chargeId,
            amount_text: fees[0].amountText,
            plan_name: planName,
            plan_type: resolvedPlanType,
            member_id: memberId,
          });
        }

        results.push({ tenant_id: tenantId, charge_id: chargeId, quantity: toSync.length, plan: planName });
      } else {
        // Zero fee — log as skipped for each item
        for (const it of tenantItems) {
          const { data: existingLog } = await supabase
            .from("officernd_sync_log")
            .select("id")
            .eq("mail_item_id", it.id)
            .in("status", ["confirmed", "pending_confirmation", "skipped_zero_fee"])
            .maybeSingle();
          if (!existingLog) {
            await supabase.from("officernd_sync_log").insert({
              mail_item_id: it.id,
              status: "skipped_zero_fee",
              charge_id: "skipped_zero_fee",
              amount_text: "0 kr.",
            });
          }
        }
        results.push({ tenant_id: tenantId, skipped: true, reason: "zero_fee" });
      }

      // Porto charges — grouped by porto_option for letters, per-item for packages
      const letterPortoGroups = new Map<string, ItemData[]>();
      const packagePortoItems: ItemData[] = [];

      for (const it of tenantItems) {
        const portoOption = it.porto_option;
        if (!portoOption) continue;
        const portoInfo = PORTO_MAP[portoOption];
        if (!portoInfo) continue;
        const isPackagePorto = portoOption.startsWith("dk_pakke_");
        if (!it.tier_name || (!isPackagePorto && it.tier_name === "Plus")) continue;

        if (isPackagePorto) {
          packagePortoItems.push(it);
        } else {
          // Group letters by porto_option (same address = same porto)
          if (!letterPortoGroups.has(portoOption)) letterPortoGroups.set(portoOption, []);
          letterPortoGroups.get(portoOption)!.push(it);
        }
      }

      // Helper to create a single porto charge
      const createPortoCharge = async (portoKey: string, chargeItems: ItemData[]) => {
        const portoInfo = PORTO_MAP[portoKey]!;
        const primaryItem = chargeItems[0];
        const stampNums = chargeItems.map(i => i.stamp_number).filter((n): n is number => n !== null).sort((a, b) => a - b);
        const stampLabel = stampNums.length > 0 ? `(nr. ${stampNums.join(", ")})` : `(?)`;

        const portoLogRes = await supabase
          .from("officernd_sync_log")
          .insert({
            mail_item_id: primaryItem.id,
            amount_text: `${portoInfo.amountKr} kr.`,
            status: "pending",
            plan_name: portoInfo.planName,
          })
          .select("id")
          .single();
        const portoLogId = portoLogRes.data?.id ?? null;

        // Log remaining items in group as included
        for (let i = 1; i < chargeItems.length; i++) {
          await supabase.from("officernd_sync_log").insert({
            mail_item_id: chargeItems[i].id,
            amount_text: "0 kr.",
            status: "porto_included_in_group",
            plan_name: portoInfo.planName,
            error_message: `Porto charged on item ${primaryItem.id}`,
          });
        }

        try {
          const portoPlanId = await findPlanId(apiBase, token, portoInfo.planName);

          const portoBody: Record<string, unknown> = {
            price: portoInfo.amountKr,
            date: new Date().toISOString(),
            quantity: 1,
            isPersonal,
            description: `[mail_item_ids:${chargeItems.map(i => i.id).join(",")}] porto ${stampLabel}`,
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

          const portoRes = await fetch(`${apiBase}/fees`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(portoBody),
          });

          if (!portoRes.ok) {
            const txt = await portoRes.text();
            throw new Error(`Porto charge failed: ${txt}`);
          }

          const portoRaw = await portoRes.json();
          const portoCharge = Array.isArray(portoRaw) ? portoRaw[0] : portoRaw;
          const portoChargeId = portoCharge?._id || portoCharge?.id || null;

          if (portoLogId) {
            await supabase.from("officernd_sync_log")
              .update({ status: "pending_confirmation", charge_id: portoChargeId, member_id: memberId, plan_type: "OneOff" } as any)
              .eq("id", portoLogId);
          }
        } catch (portoErr) {
          console.error("Porto charge error:", portoErr);
          if (portoLogId) {
            await supabase.from("officernd_sync_log")
              .update({ status: "failed", error_message: portoErr instanceof Error ? portoErr.message : String(portoErr) })
              .eq("id", portoLogId);
          }
        }
      };

      // Process letter porto groups (1 charge per unique porto_option)
      for (const [portoKey, groupItems] of letterPortoGroups) {
        await createPortoCharge(portoKey, groupItems);
      }

      // Process package porto (1 charge per package)
      for (const pkgItem of packagePortoItems) {
        await createPortoCharge(pkgItem.porto_option!, [pkgItem]);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-officernd-charge-batch error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
