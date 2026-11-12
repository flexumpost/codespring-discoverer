import '@/i18n/returns';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { returnAction } from '@/lib/returnedLetters';
import { toast } from 'sonner';
export function ReturnedLettersList({ operator = false, tenantId }: { operator?: boolean; tenantId?: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const { data: items, error, isLoading } = useQuery({ queryKey: ['returned-letters', tenantId, operator], queryFn: async () => {
    let query = supabase.from('returned_letters').select('*,tenants(company_name)').order('created_at', { ascending: false });
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }});
  async function act(id: string, action: string, response?: string) {
    setBusy(id);
    try { await returnAction({ id, action, response }); await qc.invalidateQueries({ queryKey: ['returned-letters'] }); toast.success(t(action === 'send' ? 'returns.sent' : 'returns.saved')); }
    catch (err) { toast.error(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(null); }
  }
  async function showPhoto(path: string) {
    const { data, error } = await supabase.storage.from('returned-letters').createSignedUrl(path, 3600);
    if (error) toast.error(error.message); else setPhoto(data.signedUrl);
  }
  return <section className="space-y-4 mb-6">
    {!operator && !!items?.length && <h3 className="text-lg font-semibold">{t('returns.title')}</h3>}
    {error && <p className="text-destructive">{error.message}</p>}
    {operator && !isLoading && !items?.length && <p className="text-muted-foreground">{t('returns.empty')}</p>}
    {items?.map(item => <div key={item.id} id={`return-${item.id}`} className="border-b border-border py-4 space-y-3">
      <div className="flex flex-wrap gap-3 items-center"><strong>{item.tenants?.company_name}</strong><Badge variant="secondary">{t(`returns.${item.status}`)}</Badge><span className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span></div>
      <p className="whitespace-pre-line text-sm">{item.sent_address}</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => showPhoto(item.photo_path)}>{t('returns.photo')}</Button>
        {!operator && item.status === 'notified' && <><Button disabled={busy === item.id} onClick={() => act(item.id, 'respond', 'resend_requested')}>{t('returns.yes')}</Button><Button variant="outline" disabled={busy === item.id} onClick={() => act(item.id, 'respond', 'declined')}>{t('returns.no')}</Button></>}
        {operator && item.status === 'draft' && <Button disabled={busy === item.id} onClick={() => act(item.id, 'send')}>{t('returns.send')}</Button>}
        {operator && item.status === 'resend_requested' && <Button disabled={busy === item.id} onClick={() => act(item.id, 'resent')}>{t('returns.markResent')}</Button>}
      </div>
      {operator && item.status === 'draft' && <details><summary>{t('returns.review')}</summary><strong>{item.email_subject}</strong><p className="whitespace-pre-line text-sm mt-2">{item.email_body}</p></details>}
    </div>)}
    <Dialog open={!!photo} onOpenChange={() => setPhoto(null)}><DialogContent><DialogTitle>{t('returns.photo')}</DialogTitle>{photo && <img src={photo} alt={t('returns.photo')} className="max-h-[70vh] w-full object-contain" />}</DialogContent></Dialog>
  </section>;
}