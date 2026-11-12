import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { canRespondToReturn, canMarkReturnResent, escapeReturnHtml } from '../_shared/returned-letter-rules.ts';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('prepare'), id: z.string().uuid(), tenant_id: z.string().uuid(), image: z.string().min(1).max(7_000_000), recipient_name: z.string().max(255), sent_address: z.string().trim().min(5).max(2000), subject: z.string().trim().min(1).max(255), body: z.string().trim().min(1).max(10000) }),
  z.object({ action: z.literal('send'), id: z.string().uuid() }),
  z.object({ action: z.literal('respond'), id: z.string().uuid(), response: z.enum(['resend_requested', 'declined']) }),
  z.object({ action: z.literal('resent'), id: z.string().uuid() }),
]);
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Log ind igen.' }, 401);
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !secret) return reply({ error: 'Konfiguration mangler.' }, 500);
    const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: claims, error: authError } = await caller.auth.getClaims(authorization.slice(7));
    if (authError || !claims?.claims?.sub) return reply({ error: 'Log ind igen.' }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return reply({ error: 'Kontrollér adresse, billede og e-mailtekst.' }, 400);
    const input = parsed.data;
    const { data: isOperator } = await caller.rpc('is_operator');
    if (input.action !== 'respond' && !isOperator) return reply({ error: 'Kun operatører kan registrere returbreve.' }, 403);
    const admin = createClient(url, secret);

    if (input.action === 'prepare') {
      const { data: tenant } = await admin.from('tenants').select('id').eq('id', input.tenant_id).maybeSingle();
      if (!tenant) return reply({ error: 'Lejeren findes ikke.' }, 404);
      const match = input.image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return reply({ error: 'Vælg et JPEG-, PNG- eller WebP-billede.' }, 400);
      const binary = atob(match[2]);
      if (binary.length > 5 * 1024 * 1024) return reply({ error: 'Billedet må højst fylde 5 MB.' }, 400);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      const path = `${input.id}/kuvert.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
      const { data: existing } = await admin.from('returned_letters').select('id').eq('id', input.id).maybeSingle();
      if (existing) return reply({ id: existing.id });
      const { error: uploadError } = await admin.storage.from('returned-letters').upload(path, bytes, { contentType: `image/${match[1]}`, upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await admin.from('returned_letters').insert({ id: input.id, tenant_id: input.tenant_id, operator_id: claims.claims.sub, photo_path: path, recipient_name: input.recipient_name, sent_address: input.sent_address, email_subject: input.subject, email_body: input.body });
      if (error) { await admin.storage.from('returned-letters').remove([path]); throw error; }
      return reply({ id: input.id });
    }

    // Fetch through the caller so tenant membership and draft visibility are enforced by RLS.
    const { data: item, error: readError } = await caller.from('returned_letters').select('*').eq('id', input.id).maybeSingle();
    if (readError) throw readError;
    if (!item) return reply({ error: 'Returbrevet findes ikke eller er ikke tilgængeligt.' }, 404);
    if (input.action === 'respond') {
      if (!canRespondToReturn(item.status, input.response)) return reply({ error: 'Der er allerede svaret på dette returbrev.' }, 409);
      const { data: updated, error } = await admin.from('returned_letters').update({ status: input.response, responded_at: new Date().toISOString() }).eq('id', item.id).eq('status', 'notified').select('id').maybeSingle();
      if (error) throw error;
      if (!updated) return reply({ error: 'Der er allerede svaret på dette returbrev.' }, 409);
      // One operator notice per response, visible in the existing notification bell.
      const { error: noticeError } = await admin.from('notifications').insert({ user_id: item.operator_id, title: 'Svar på returbrev', message: `${item.recipient_name}: ${input.response === 'resend_requested' ? 'ønsker genforsendelse' : 'ønsker ikke genforsendelse'}.` });
      if (noticeError) console.error('Return response notice failed', noticeError.message);
      return reply({ success: true });
    }
    if (input.action === 'resent') {
      if (!canMarkReturnResent(item.status)) return reply({ error: 'Lejeren har ikke anmodet om genforsendelse.' }, 409);
      const { error } = await admin.from('returned_letters').update({ status: 'resent' }).eq('id', item.id).eq('status', 'resend_requested');
      if (error) throw error;
      return reply({ success: true });
    }
    if (item.email_sent_at) return reply({ success: true });
    const { data: tenant } = await admin.from('tenants').select('contact_email,user_id').eq('id', item.tenant_id).single();
    let email = tenant?.contact_email;
    if (tenant?.user_id) {
      const { data } = await admin.auth.admin.getUserById(tenant.user_id);
      email = data.user?.email || email;
    }
    if (!email) return reply({ error: 'Lejeren mangler en e-mailadresse.' }, 400);
    const key = Deno.env.get('RESEND_API_KEY');
    if (!key) return reply({ error: 'E-mailforbindelsen mangler.' }, 500);
    const { data: photo, error: photoError } = await admin.storage.from('returned-letters').download(item.photo_path);
    if (photoError || !photo) throw photoError || new Error('Billedet mangler.');
    const bytes = new Uint8Array(await photo.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    const link = `https://post.flexum.dk/?return=${item.id}`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `returned-letter-${item.id}` },
      body: JSON.stringify({ from: 'Flexum Coworking <kontakt@flexum.dk>', to: [email], reply_to: 'kontakt@flexum.dk', subject: item.email_subject,
        text: `${item.email_body}\n\nVælg om brevene skal sendes igen i din digitale postkasse: ${link}`,
        html: `<div style="font-family:Arial,sans-serif"><h2>Flexum · Returbrev</h2><p>${escapeReturnHtml(item.email_body).replace(/\n/g, '<br>')}</p><p><a href="${escapeReturnHtml(link)}">Vælg i den digitale postkasse</a></p></div>`,
        attachments: [{ filename: item.photo_path.split('/').pop(), content: btoa(binary) }] }),
    });
    const result = await res.json();
    if (!res.ok) {
      await admin.from('email_send_log').insert({ template_name: 'returned-letter', recipient_email: email, status: 'failed', error_message: result.message || 'E-mail kunne ikke sendes.', metadata: { return_id: item.id } });
      return reply({ error: result.message || 'E-mail kunne ikke sendes.' }, res.status);
    }
    const { error: saveError } = await admin.from('returned_letters').update({ status: 'notified', email_sent_at: new Date().toISOString() }).eq('id', item.id);
    if (saveError) throw saveError;
    await admin.from('email_send_log').insert({ message_id: result.id, template_name: 'returned-letter', recipient_email: email, status: 'sent', metadata: { return_id: item.id, tenant_id: item.tenant_id, provider: 'resend', attachment: true } });
    if (tenant?.user_id) await admin.from('notifications').insert({ user_id: tenant.user_id, title: 'Post modtaget retur', message: 'Vi har fået din post retur. Vælg om den skal sendes igen under Retur breve.' });
    return reply({ success: true });
  } catch (error) {
    console.error('Returned letter error', error instanceof Error ? error.message : 'Unknown');
    return reply({ error: error instanceof Error ? error.message : 'Handlingen kunne ikke gennemføres.' }, 500);
  }
});