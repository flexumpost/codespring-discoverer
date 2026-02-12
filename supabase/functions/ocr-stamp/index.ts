import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, crop_base64 } = await req.json();

    if (!image_base64 && !crop_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 or crop_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // If crop_base64 is provided, do simple text extraction from the cropped region
    if (crop_base64) {
      const cropImageUrl = crop_base64.startsWith("data:")
        ? crop_base64
        : `data:image/jpeg;base64,${crop_base64}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "Du er en OCR-assistent. Læs al tekst i dette billedudsnit. Returner KUN den aflæste tekst uden forklaring. Hvis du ikke kan læse noget, returner NULL.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Læs teksten i dette billedudsnit." },
                { type: "image_url", image_url: { url: cropImageUrl } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit - prøv igen om lidt" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI-kredit opbrugt" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const text = await response.text();
        console.error("AI gateway error:", response.status, text);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const ocrText = data.choices?.[0]?.message?.content?.trim() ?? "";
      console.log("Crop OCR result:", ocrText);

      return new Response(
        JSON.stringify({ ocr_text: ocrText === "NULL" ? null : ocrText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Full image: extract both stamp_number and recipient_name via tool calling
    const imageUrl = image_base64.startsWith("data:")
      ? image_base64
      : `data:image/jpeg;base64,${image_base64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Du er en OCR-assistent der analyserer fotos af forsendelser (breve og pakker). Find forsendelsesnummeret (tracking number / stempelnummer) OG modtagerens navn. Brug funktionen extract_mail_info til at returnere resultaterne.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analysér dette billede af en forsendelse. Find forsendelsesnummeret og modtagerens navn.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_mail_info",
              description: "Returnerer forsendelsesnummer og modtagernavn fundet på forsendelsen",
              parameters: {
                type: "object",
                properties: {
                  stamp_number: {
                    type: "string",
                    description: "Forsendelsesnummeret (kun cifre). Returner tom streng hvis ikke fundet.",
                  },
                  recipient_name: {
                    type: "string",
                    description: "Modtagerens fulde navn som står på forsendelsen. Returner tom streng hvis ikke fundet.",
                  },
                },
                required: ["stamp_number", "recipient_name"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_mail_info" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit - prøv igen om lidt" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-kredit opbrugt" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse tool call result
    let stamp_number: string | null = null;
    let recipient_name: string | null = null;

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const digits = (args.stamp_number || "").replace(/\D/g, "");
        stamp_number = digits.length > 0 ? digits : null;
        recipient_name = args.recipient_name?.trim() || null;
      } catch (parseErr) {
        console.error("Failed to parse tool call args:", parseErr);
      }
    }

    // Fallback: if no tool call, try content
    if (!toolCall) {
      const rawResult = data.choices?.[0]?.message?.content?.trim() ?? "";
      const digits = rawResult.replace(/\D/g, "");
      stamp_number = digits.length > 0 ? digits : null;
    }

    console.log("OCR result -> stamp_number:", stamp_number, "recipient_name:", recipient_name);

    return new Response(
      JSON.stringify({ stamp_number, recipient_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ocr-stamp error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
