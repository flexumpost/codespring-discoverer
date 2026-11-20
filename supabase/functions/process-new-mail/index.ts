import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { z } from 'npm:zod@3';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { mailSummary, escapeMailHtml } from '../_shared/new-mail-summary.ts';
import { NewShipmentEmail } from '../_shared/email-templates/new-shipment.tsx';
import { WelcomeShipmentEmail } from '../_shared/email-templates/welcome-shipment.tsx';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const denied = authenticateCronRequest(request);
  if (denied) return new Response(await denied.text(), { status: denied.status, headers: corsHeaders });
  const parsed = z.object({}).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400, headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return Response.json({ error: 'Server configuration error' }, { status: 500, headers: corsHeaders });
  const db = createClient(url, key);
  const { data: batches, error } = await db.rpc('claim_new_mail_batches');
  if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  for (const batch of batches ?? []) {
    try {
      const { data: tenant, error: te } = await db.from('tenants').select('id,company_name,contact_email,user_id,is_active').eq('id', batch.tenant_id).single();
      if (te) throw te;
      if (!tenant.is_active) { await db.from('new_mail_batches').update({ status: 'sent' }).eq('id', batch.id); continue; }
      const { data: items, error: ie } = await db.from('mail_items').select('stamp_number,sender_name,mail_type').in('id', batch.mail_item_ids).eq('tenant_id', batch.tenant_id);
      if (ie) throw ie;
      if (!items?.length) { await db.from('new_mail_batches').update({ status: 'sent' }).eq('id', batch.id); continue; }
      const summary = mailSummary(items);
      const { data: members, error: me } = await db.from('tenant_users').select('user_id').eq('tenant_id', tenant.id);
      if (me) throw me;
      const users = [...new Set([tenant.user_id, ...(members ?? []).map(m => m.user_id)].filter((u): u is string => !!u))];
      const { data: profiles, error: pe } = users.length ? await db.from('profiles').select('id,email').in('id', users) : { data: [], error: null };
      if (pe) throw pe;
      const emails = [...new Set([tenant.contact_email, ...(profiles ?? []).map(p => p.email)].filter((e): e is string => !!e).map(e => e.toLowerCase()))];
      const { data: preferences, error: se } = users.length ? await db.from('sms_preferences').select('user_id,phone_number').in('user_id', users).eq('enabled', true) : { data: [], error: null };
      if (se) throw se;
      const phones = [...new Set((preferences ?? []).map(p => p.phone_number).filter((p): p is string => !!p))];
      const recipients = [...emails.map(recipient => ({ batch_id: batch.id, channel: 'email', recipient })), ...phones.map(recipient => ({ batch_id: batch.id, channel: 'sms', recipient }))];
      if (recipients.length) {
        const { error: de } = await db.from('new_mail_deliveries').upsert(recipients, { onConflict: 'batch_id,channel,recipient', ignoreDuplicates: true });
        if (de) throw de;
      }
      const { data: deliveries, error: re } = await db.from('new_mail_deliveries').select('*').eq('batch_id', batch.id);
      if (re) throw re;
      let failure = false;
      for (const delivery of deliveries ?? []) {
        if (delivery.status === 'sent' || delivery.status === 'skipped') continue;
        // An interrupted request may have reached the provider. Never resend ambiguously accepted SMS.
        if (delivery.status !== 'pending') { failure = true; continue; }
        if (delivery.channel === 'sms') {
          const { data: consent, error: ce } = await db.from('sms_preferences').select('user_id').in('user_id', users).eq('enabled', true).eq('phone_number', delivery.recipient);
          if (ce) throw ce;
          if (!consent?.length) { await db.from('new_mail_deliveries').update({ status: 'skipped' }).eq('id', delivery.id); continue; }
        }
        const { data: claimed, error: claimError } = await db.from('new_mail_deliveries').update({ status: 'sending', updated_at: new Date().toISOString() }).eq('id', delivery.id).eq('status', 'pending').select('id');
        if (claimError) throw claimError;
        if (!claimed?.length) continue;
        try {
          let providerId: string | undefined;
          if (delivery.channel === 'email') {
            const resend = Deno.env.get('RESEND_API_KEY');
            if (!resend) throw new Error('Email service not configured');
            const subject = `Ny post: ${summary.count} — ${tenant.company_name}`;
            const text = `Vi har modtaget ${summary.count} til ${tenant.company_name}.\n\n${summary.lines.join('\n')}`;
            const htmlBody = `<p>${escapeMailHtml(`Vi har modtaget ${summary.count} til ${tenant.company_name}.`)}</p><ul>${summary.lines.map(line => `<li>${escapeMailHtml(line)}</li>`).join('')}</ul>`;
            let onboardingUrl: string | null = null;
            const ownerEmail = profiles?.find(p => p.id === tenant.user_id)?.email ?? tenant.contact_email;
            if (tenant.user_id && delivery.recipient === ownerEmail?.toLowerCase()) {
              const { data: owner, error: oe } = await db.auth.admin.getUserById(tenant.user_id);
              if (oe) throw oe;
              if (owner.user && !owner.user.last_sign_in_at) {
                const { data: token, error: tokenError } = await db.from('onboarding_tokens').insert({ email: ownerEmail, expires_at: new Date(Date.now() + 86400000).toISOString() }).select('token').single();
                if (tokenError) throw tokenError;
                onboardingUrl = `https://post.flexum.dk/set-password?onboarding_token=${token.token}`;
              }
            }
            const html = await renderAsync(onboardingUrl ? WelcomeShipmentEmail({ name: escapeMailHtml(tenant.company_name), subject, bodyHtml: htmlBody, confirmationUrl: escapeMailHtml(onboardingUrl) }) : NewShipmentEmail({ name: escapeMailHtml(tenant.company_name), subject, bodyHtml: htmlBody, loginUrl: 'https://post.flexum.dk/login' }));
            const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json', 'Idempotency-Key': delivery.id }, body: JSON.stringify({ from: 'Flexum Coworking <kontakt@flexum.dk>', to: [delivery.recipient], subject, html, text: text + '\n\n' + (onboardingUrl ?? 'https://post.flexum.dk/login') }) });
            const body = await response.text();
            if (!response.ok) throw new Error(`Email provider [${response.status}]: ${body}`);
            providerId = JSON.parse(body).id;
            await db.from('email_send_log').insert({ message_id: providerId ?? delivery.id, template_name: 'new_shipment', recipient_email: delivery.recipient, status: 'sent', metadata: { tenant_id: tenant.id, batch_id: batch.id, provider: 'resend' } });
            await new Promise(resolve => setTimeout(resolve, 250));
          } else {
            const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
            const connectionKey = Deno.env.get('CLICKSEND_API_KEY');
            if (!gatewayKey || !connectionKey) throw new Error('ClickSend connection not configured');
            const response = await fetch('https://connector-gateway.lovable.dev/udc_clicksend/v3/sms/send', { method: 'POST', headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ to: delivery.recipient, body: summary.sms, source: 'sdk', custom_string: delivery.id }] }) });
            const body = await response.text();
            if (!response.ok) throw new Error(`ClickSend [${response.status}]: ${body}`);
            const result = JSON.parse(body);
            const message = result.data?.messages?.[0];
            if (result.response_code !== 'SUCCESS' || message?.status !== 'SUCCESS') throw new Error(`ClickSend rejected message: ${body}`);
            providerId = message.message_id;
          }
          const { error: saved } = await db.from('new_mail_deliveries').update({ status: 'sent', provider_id: providerId, updated_at: new Date().toISOString() }).eq('id', delivery.id);
          if (saved) throw saved;
        } catch (e) {
          failure = true;
          await db.from('new_mail_deliveries').update({ status: 'failed', error_message: String(e), updated_at: new Date().toISOString() }).eq('id', delivery.id);
        }
      }
      await db.from('new_mail_batches').update({ status: failure ? 'failed' : 'sent', error_message: failure ? 'One or more deliveries require review' : null }).eq('id', batch.id);
    } catch (e) { await db.from('new_mail_batches').update({ status: 'failed', error_message: String(e) }).eq('id', batch.id); }
  }
  const { error: idleError } = await db.rpc('pause_idle_new_mail_worker');
  if (idleError) return Response.json({ error: idleError.message }, { status: 500, headers: corsHeaders });
  return Response.json({ processed: batches?.length ?? 0 }, { headers: corsHeaders });
});