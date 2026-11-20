import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTour } from '@/hooks/useTour';
import { useTenants } from '@/hooks/useTenants';
import { useSmsPreferences } from '@/hooks/useSmsPreferences';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import '@/i18n/sms';

export function SmsPreferences({ prompt = false }: { prompt?: boolean }) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { running } = useTour();
  const { selectedTenant, isLoading: tenantsLoading } = useTenants();
  const { data, isLoading, isError, save } = useSmsPreferences();
  const [phone, setPhone] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { setPhone(data?.phone_number ?? ''); setEnabled(data?.enabled ?? false); }, [data]);
  const persist = async (value: boolean) => {
    try { await save.mutateAsync({ enabled: value, phone }); setDismissed(true); toast.success(t('sms.saved')); }
    catch (error) { toast.error(t(error instanceof Error && error.message === 'invalid_phone' ? 'sms.invalid' : 'sms.error')); }
  };
  if (role !== 'tenant' || isLoading || isError) return null;
  const fields = <div className="space-y-4">
    {!prompt && <div className="flex items-center justify-between gap-3"><Label htmlFor="sms-enabled">{t('sms.enabled')}</Label><Switch id="sms-enabled" checked={enabled} onCheckedChange={setEnabled} /></div>}
    <div className="space-y-2"><Label htmlFor={prompt ? 'sms-prompt-phone' : 'sms-phone'}>{t('sms.phone')}</Label><Input id={prompt ? 'sms-prompt-phone' : 'sms-phone'} type="tel" autoComplete="tel" placeholder="+45" value={phone} onChange={e => setPhone(e.target.value)} disabled={save.isPending} /></div>
  </div>;
  if (!prompt) return <section className="space-y-4 border-t border-border pt-5"><h3 className="font-semibold">{t('sms.title')}</h3>{fields}<Button disabled={save.isPending} onClick={() => persist(enabled)}>{t(save.isPending ? 'common.saving' : 'common.save')}</Button></section>;
  const open = !data && !dismissed && !running && !tenantsLoading && selectedTenant?.shipping_confirmed === true;
  return <Dialog open={open} onOpenChange={value => { if (!value && !save.isPending) setDismissed(true); }}><DialogContent onInteractOutside={e => e.preventDefault()}><DialogHeader><DialogTitle>{t('sms.question')}</DialogTitle><DialogDescription>{t('sms.description')}</DialogDescription></DialogHeader>{fields}<DialogFooter><Button variant="outline" disabled={save.isPending} onClick={() => persist(false)}>{t('sms.no')}</Button><Button disabled={save.isPending} onClick={() => persist(true)}>{t('sms.yes')}</Button></DialogFooter></DialogContent></Dialog>;
}