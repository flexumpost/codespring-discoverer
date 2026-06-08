import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: row, error: selErr } = await supabaseAdmin
      .from("onboarding_tokens")
      .select("token, email, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (selErr || !row) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.used_at) {
      return new Response(JSON.stringify({ error: "token_used" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "token_expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a magic link for this email and parse out tokens we can return to the client
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: row.email,
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("generateLink failed:", linkError);
      return new Response(JSON.stringify({ error: "link_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark token consumed
    await supabaseAdmin
      .from("onboarding_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    // Parse hashed_token + verification type from action_link (verify endpoint)
    // action_link example: https://<proj>.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=...
    const url = new URL(linkData.properties.action_link);
    const hashedToken = url.searchParams.get("token");
    const type = url.searchParams.get("type") ?? "magiclink";

    return new Response(
      JSON.stringify({ hashed_token: hashedToken, type, email: row.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("consume-onboarding-token error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
