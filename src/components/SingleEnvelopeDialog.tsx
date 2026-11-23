import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { EnvelopePrint, type EnvelopeGroup } from '@/components/EnvelopePrint';
import { singleEnvelope, type EnvelopeTenant } from '@/lib/singleEnvelope';
import '@/i18n/singleEnvelope';

const fields = [
  ['shippingRecipient', 'recipient', true], ['shippingCo', 'co', false],
  ['shippingAddress', 'address', true], ['shippingAddress2', 'address2', false],
  ['shippingZip', 'zip', false], ['shippingCity', 'city', false],
  ['shippingState', 'state', false], ['shippingCountry', 'country', false],
] as const;

export function SingleEnvelopeDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(singleEnvelope);
  const [printing, setPrinting] = useState<EnvelopeGroup[] | null>(null);
  const afterPrint = useCallback(() => setPrinting(null), []);
  const { data: tenants = [], isLoading, error, refetch } = useQuery({
    queryKey: ['single-envelope-tenants'],
    enabled: open,
    queryFn: async () => {
      const all: EnvelopeTenant[] = [];
      // Retrieve every tenant, including closed accounts and lists larger than the API page limit.
      for (let from = 0; ; from += 500) {
        const { data, error } = await supabase.from('tenants')
          .select('id,company_name,shipping_recipient,shipping_co,shipping_address,shipping_address_2,shipping_zip,shipping_city,shipping_state,shipping_country')
          .order('company_name').order('id').range(from, from + 499);
        if (error) throw error;
        all.push(...data);
        if (data.length < 500) return all;
      }
    },
  });

  const choose = (tenant?: EnvelopeTenant) => {
    setSelectedId(tenant?.id ?? '');
    setDraft(singleEnvelope(tenant));
    setPickerOpen(false);
  };

  return <>
    <Button variant="outline" onClick={() => { choose(); setOpen(true); }}>
      <Printer className="mr-2 h-4 w-4 shrink-0" />{t('singleEnvelope.title')}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{t('singleEnvelope.title')}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          if (!draft.shippingRecipient?.trim() || !draft.shippingAddress?.trim()) return;
          setOpen(false);
          setPrinting([{ ...draft }]);
        }}>
          <div className="space-y-2">
            <Label id="envelope-tenant-label">{t('singleEnvelope.tenant')}</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen} modal>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-labelledby="envelope-tenant-label" aria-expanded={pickerOpen} className="w-full justify-between h-auto min-h-10 text-left">
                  <span className="break-words min-w-0">{tenants.find(tenant => tenant.id === selectedId)?.company_name ?? t('singleEnvelope.choose')}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('singleEnvelope.search')} />
                  <CommandList>
                    {isLoading ? <p className="p-3 text-sm text-muted-foreground">{t('singleEnvelope.loading')}</p> : error ?
                      <div className="p-3 text-sm text-destructive">{t('singleEnvelope.error')}<Button type="button" variant="ghost" onClick={() => refetch()}>{t('singleEnvelope.retry')}</Button></div> :
                      <CommandEmpty>{t('singleEnvelope.none')}</CommandEmpty>}
                    <CommandGroup>
                      <CommandItem value={t('singleEnvelope.other')} onSelect={() => choose()}>{t('singleEnvelope.other')}</CommandItem>
                      {tenants.map(tenant => <CommandItem key={tenant.id} value={`${tenant.company_name} ${tenant.id}`} onSelect={() => choose(tenant)} className="gap-2">
                        <span className="flex-1 break-words">{tenant.company_name}</span>
                        {selectedId === tenant.id && <Check className="h-4 w-4 shrink-0" />}
                      </CommandItem>)}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(([key, label, required]) => <div key={key} className={`space-y-2 ${['shippingRecipient', 'shippingCo', 'shippingAddress', 'shippingAddress2'].includes(key) ? 'sm:col-span-2' : ''}`}>
              <Label htmlFor={`envelope-${key}`}>{t(`singleEnvelope.${label}`)}{required ? ' *' : ''}</Label>
              <Input id={`envelope-${key}`} value={draft[key] ?? ''} required={required}
                onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} />
            </div>)}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="envelope-print-p" checked={draft.printP ?? false} onCheckedChange={checked => setDraft(previous => ({ ...previous, printP: checked === true }))} />
            <Label htmlFor="envelope-print-p" className="text-base font-bold">P</Label>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('singleEnvelope.cancel')}</Button>
            <Button type="submit" disabled={!draft.shippingRecipient?.trim() || !draft.shippingAddress?.trim()}><Printer className="mr-2 h-4 w-4" />{t('singleEnvelope.print')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {printing && <EnvelopePrint groups={printing} onAfterPrint={afterPrint} />}
  </>;
}