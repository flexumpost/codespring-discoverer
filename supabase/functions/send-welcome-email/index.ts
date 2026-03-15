import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { WelcomeEmail } from "../_shared/email-templates/welcome.tsx";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is operator
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await supabaseUser.auth.getUser();
    if (claimsErr || !claims.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", claims.user.id)
      .eq("role", "operator")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { tenant_ids } = await req.json();
    if (!Array.isArray(tenant_ids) || tenant_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "tenant_ids array required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get welcome template
    const { data: template } = await supabaseAdmin
      .from("email_templates")
      .select("subject, body")
      .eq("slug", "welcome")
      .maybeSingle();

    if (!template) {
      return new Response(
        JSON.stringify({ error: "Welcome email template not found (slug: welcome)" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get tenants
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, company_name, contact_name, contact_email")
      .in("id", tenant_ids);

    const results: { id: string; status: string; error?: string }[] = [];

    for (const tenant of tenants ?? []) {
      if (!tenant.contact_email) {
        results.push({ id: tenant.id, status: "skipped", error: "no contact_email" });
        continue;
      }

      const name = tenant.contact_name || tenant.company_name;
      const subject = template.subject
        .replace(/\{\{company_name\}\}/g, tenant.company_name)
        .replace(/\{\{name\}\}/g, name);
      const bodyRaw = template.body
        .replace(/\{\{company_name\}\}/g, tenant.company_name)
        .replace(/\{\{name\}\}/g, name);

      try {
        // Render branded React Email template
        const html = await renderAsync(
          WelcomeEmail({
            name,
            subject,
            bodyHtml: bodyRaw.replace(/\n/g, "<br />"),
          })
        );

        // Enqueue via email queue for retry safety
        const { error: enqueueErr } = await supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to: tenant.contact_email,
            subject,
            html,
            template_name: "welcome",
          },
        });

        if (enqueueErr) {
          results.push({ id: tenant.id, status: "failed", error: enqueueErr.message });
          continue;
        }

        await supabaseAdmin
          .from("tenants")
          .update({ welcome_email_sent_at: new Date().toISOString() })
          .eq("id", tenant.id);

        results.push({ id: tenant.id, status: "queued" });
      } catch (e) {
        results.push({ id: tenant.id, status: "failed", error: String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
