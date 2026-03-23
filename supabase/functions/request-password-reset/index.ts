import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = "Flexum Coworking"
const SENDER_DOMAIN = "notify.flexum.dk"
const FROM_DOMAIN = "notify.flexum.dk"

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleanEmail = email.trim().toLowerCase()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Rate limit: max 5 unique recovery attempts per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentRows } = await supabase
      .from('email_send_log')
      .select('message_id')
      .eq('recipient_email', cleanEmail)
      .eq('template_name', 'recovery')
      .gte('created_at', oneHourAgo)

    const uniqueAttempts = new Set(
      (recentRows ?? []).map(r => r.message_id).filter(Boolean)
    ).size

    if (uniqueAttempts >= 5) {
      // Silently return success to prevent enumeration
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate recovery link server-side
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: { redirectTo: 'https://post.flexum.dk/set-password' },
    })

    if (linkError || !linkData?.properties?.action_link) {
      // User not found or other error — return generic success (no enumeration)
      console.log('generateLink failed (possibly unknown email)', { error: linkError?.message })
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const confirmationUrl = linkData.properties.action_link

    // Render email template
    const html = await renderAsync(
      React.createElement(RecoveryEmail, { siteName: SITE_NAME, confirmationUrl })
    )
    const text = await renderAsync(
      React.createElement(RecoveryEmail, { siteName: SITE_NAME, confirmationUrl }),
      { plainText: true }
    )

    const messageId = crypto.randomUUID()

    // Log pending
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'recovery',
      recipient_email: cleanEmail,
      status: 'pending',
    })

    // Send directly via Resend API
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Flexum <kontakt@flexum.dk>',
        to: [cleanEmail],
        subject: 'Nulstil din adgangskode',
        html,
        text,
      }),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.text()
      console.error('Resend API error:', resendRes.status, errBody)
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'recovery',
        recipient_email: cleanEmail,
        status: 'failed',
        error_message: `Resend ${resendRes.status}: ${errBody}`,
      })
    } else {
      console.log('Recovery email sent', { email: cleanEmail })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'recovery',
        recipient_email: cleanEmail,
        status: 'sent',
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('request-password-reset error:', error)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
