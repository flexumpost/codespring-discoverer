import '@/i18n/returns';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { ReturnedLettersList } from '@/components/ReturnedLettersList';
import { ReturnEnvelopeCamera } from '@/components/ReturnEnvelopeCamera';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fuzzyMatchTenant } from '@/lib/fuzzyMatchTenant';
import { returnAction, parseReturnShipmentNumbers, returnDispatchNotice } from '@/lib/returnedLetters';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';

export default function ReturnedLettersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [image, setImage] = useState('');
  const [address, setAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [shipmentNumbers, setShipmentNumbers] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const { data: tenants = [] } = useQuery({ queryKey: ['return-tenants'], queryFn: async () => {
    const { data, error } = await supabase.from('tenants').select('id,company_name,contact_first_name,contact_last_name,shipping_address,shipping_zip');
    if (error) throw error;
    return data;
  }});
  const reset = () => { setImage(''); setAddress(''); setRecipient(''); setTenantId(''); setShipmentNumbers(''); setDraftId(null); };
  async function loadPhoto(file: File) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error(t('returns.fileError')); return; }
    reset(); setCamera(false); setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      setImage(base64);
      const { data, error } = await supabase.functions.invoke('ocr-stamp', { body: { image_base64: base64 } });
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        throw new Error(details?.error || error.message);
      }
      setRecipient(data.recipient_name || ''); setAddress(data.recipient_address || '');
      const match = fuzzyMatchTenant(data.recipient_name || '', tenants);
      if (match) setTenantId(match.id);
      else {
        const normal = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        const detected = normal(data.recipient_address || '');
        const matches = tenants.filter(tenant => tenant.shipping_address && tenant.shipping_zip && detected.includes(normal(tenant.shipping_address)) && detected.includes(normal(tenant.shipping_zip)));
        if (matches.length === 1) setTenantId(matches[0].id);
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  async function openReview() {
    setBusy(true);
    try {
    const numbers = parseReturnShipmentNumbers(shipmentNumbers);
    const { data, error } = await supabase.from('mail_items').select('stamp_number,tenant_id,mail_type,status').in('stamp_number', numbers);
    if (error) throw error;
    if (!data || data.length !== numbers.length || data.some(item => item.tenant_id !== tenantId || item.mail_type !== 'brev' || !['sendt_med_dao','sendt_med_postnord'].includes(item.status))) throw new Error(t('returns.numbersError'));
    setSubject(t('returns.emailSubject'));
    setBody(t('returns.emailBody', { name: tenants.find(tenant => tenant.id === tenantId)?.company_name, address }));
    setReview(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  async function send() {
    setBusy(true);
    try {
      let id = draftId;
      if (!id) {
        id = crypto.randomUUID();
        await returnAction({ action: 'prepare', id, tenant_id: tenantId, shipment_numbers: parseReturnShipmentNumbers(shipmentNumbers), image, recipient_name: recipient, sent_address: address, subject, body });
        setDraftId(id);
      }
      await returnAction({ action: 'send', id });
      toast.success(t('returns.sent')); setReview(false); reset();
    } catch (error) { toast.error(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); qc.invalidateQueries({ queryKey: ['returned-letters'] }); }
  }
  return <AppLayout><div className="max-w-5xl space-y-6"><h1 className="text-2xl font-bold">{t('returns.title')}</h1>
    <section className="space-y-4 border-b border-border pb-6"><h2 className="font-semibold text-lg">{t('returns.register')}</h2>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void loadPhoto(file); event.target.value = ''; }} />
      <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => setCamera(true)}><Camera className="h-4 w-4 mr-2" />{t('returns.takePhoto')}</Button><Button variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4 mr-2" />{t('returns.upload')}</Button>{image && <Button variant="ghost" disabled={busy} onClick={reset}>{t('returns.reset')}</Button>}</div>
      {busy && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('returns.loading')}</p>}
      {image && <div className="grid md:grid-cols-2 gap-6"><img src={image} alt={t('returns.photo')} className="w-full max-h-96 object-contain bg-muted" /><div className="space-y-4">
        <div><Label htmlFor="return-recipient">{t('returns.recipient')}</Label><Input id="return-recipient" value={recipient} disabled={busy || !!draftId} onChange={e => setRecipient(e.target.value)} /></div>
        <div><Label htmlFor="return-address">{t('returns.address')}</Label><Textarea id="return-address" rows={5} value={address} disabled={busy || !!draftId} onChange={e => setAddress(e.target.value)} /></div>
        <div><Label>{t('returns.tenant')}</Label><Select value={tenantId} onValueChange={setTenantId} disabled={busy || !!draftId}><SelectTrigger aria-label={t('returns.tenant')}><SelectValue placeholder={t('returns.chooseTenant')} /></SelectTrigger><SelectContent>{tenants.map(tenant => <SelectItem key={tenant.id} value={tenant.id}>{tenant.company_name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="return-numbers">{t('returns.numbers')}</Label><Input id="return-numbers" placeholder="4107, 4108" value={shipmentNumbers} disabled={busy || !!draftId} onChange={e => setShipmentNumbers(e.target.value)} /></div>
        <Button disabled={busy || !tenantId || !shipmentNumbers.trim() || address.trim().length < 5 || !!draftId} onClick={openReview}>{t('returns.approveTenant')}</Button>
      </div></div>}
    </section>
    <ReturnedLettersList operator />
    <Dialog open={camera} onOpenChange={setCamera}><DialogContent><DialogTitle>{t('returns.takePhoto')}</DialogTitle><ReturnEnvelopeCamera onPhoto={loadPhoto} /></DialogContent></Dialog>
    <Dialog open={review} onOpenChange={value => { if (!busy) setReview(value); }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{t('returns.review')}</DialogTitle></DialogHeader>
      <Label htmlFor="return-subject">{t('returns.subject')}</Label><Input id="return-subject" value={subject} disabled={busy || !!draftId} onChange={e => setSubject(e.target.value)} />
      <Label htmlFor="return-body">{t('returns.body')}</Label><Textarea id="return-body" rows={14} value={body} disabled={busy || !!draftId} onChange={e => setBody(e.target.value)} />
      <p className="text-sm font-medium whitespace-pre-line">{returnDispatchNotice(shipmentNumbers.split(/[\s,;]+/).filter(Boolean).map(Number))}</p>
      <p className="text-sm text-muted-foreground">{t('returns.attachment')}</p><img src={image} alt={t('returns.photo')} className="h-24 object-contain" />
      <Button disabled={busy || !subject.trim() || !body.trim()} onClick={send}>{t('returns.send')}</Button>
    </DialogContent></Dialog>
  </div></AppLayout>;
}