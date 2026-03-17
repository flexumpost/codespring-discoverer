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

    // Enqueue in auth_emails queue
    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'auth_emails',
      payload: {
        run_id: messageId,
        message_id: messageId,
        to: cleanEmail,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: 'Nulstil din adgangskode',
        html,
        text,
        purpose: 'transactional',
        label: 'recovery',
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue recovery email', { error: enqueueError })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'recovery',
        recipient_email: cleanEmail,
        status: 'failed',
        error_message: 'Failed to enqueue email',
      })
    } else {
      console.log('Recovery email enqueued', { email: cleanEmail })
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
