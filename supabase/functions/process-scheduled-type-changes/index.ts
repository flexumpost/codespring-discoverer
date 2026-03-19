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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

    // Get pending scheduled changes
    const { data: pending, error: fetchErr } = await supabase
      .from("scheduled_type_changes")
      .select("id, tenant_id, new_tenant_type_id")
      .lte("effective_date", today)
      .is("executed_at", null);

    if (fetchErr) throw fetchErr;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up "Retur til afsender" type id
    const { data: returType } = await supabase
      .from("tenant_types")
      .select("id")
      .eq("name", "Retur til afsender")
      .single();

    const returTypeId = returType?.id;
    let processed = 0;

    for (const change of pending) {
      const isRetur = change.new_tenant_type_id === returTypeId;

      const updatePayload: Record<string, unknown> = {
        tenant_type_id: change.new_tenant_type_id,
      };
      if (isRetur) {
        updatePayload.is_active = false;
      }

      const { error: updateErr } = await supabase
        .from("tenants")
        .update(updatePayload)
        .eq("id", change.tenant_id);

      if (updateErr) {
        console.error(`Failed to update tenant ${change.tenant_id}:`, updateErr);
        continue;
      }

      // Mark as executed
      await supabase
        .from("scheduled_type_changes")
        .update({ executed_at: new Date().toISOString() })
        .eq("id", change.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error processing scheduled type changes:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
