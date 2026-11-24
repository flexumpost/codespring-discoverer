import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildSmsOverview, type SmsStatus } from '@/lib/smsOverview';
import '@/i18n/smsOverview';

async function fetchAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export default function SmsOverviewPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('enabled');
  const { data: rows = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['operator-sms-overview'],
    queryFn: async () => {
      const [tenants, profiles, memberships, preferences] = await Promise.all([
        fetchAll((a, b) => supabase.from('tenants').select('id, company_name, user_id, is_active').order('id').range(a, b)),
        fetchAll((a, b) => supabase.from('profiles').select('id, first_name, last_name, email').order('id').range(a, b)),
        fetchAll((a, b) => supabase.from('tenant_users').select('tenant_id, user_id').order('id').range(a, b)),
        fetchAll((a, b) => supabase.from('sms_preferences').select('user_id, enabled, phone_number, updated_at').order('user_id').range(a, b)),
      ]);
      return buildSmsOverview(tenants, profiles, memberships, preferences);
    },
  });
  const statuses: ('all' | SmsStatus)[] = ['all', 'enabled', 'declined', 'pending'];
  const query = search.trim().toLocaleLowerCase();
  const visible = rows.filter(row => (filter === 'all' || row.status === filter) &&
    [row.name, row.email, row.phone ?? '', ...row.companies.map(c => c.name)].join(' ').toLocaleLowerCase().includes(query));

  return <AppLayout>
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('smsOverview.title')}</h1>
        <Button variant="outline" size="icon" aria-label={t('smsOverview.refresh')} title={t('smsOverview.refresh')} onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} />
        </Button>
      </div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="h-auto flex flex-wrap justify-start">
            {statuses.map(status => <TabsTrigger key={status} value={status} className="gap-2">
              {t(`smsOverview.${status}`)}<span className="text-xs tabular-nums">{isLoading || isError ? '—' : status === 'all' ? rows.length : rows.filter(r => r.status === status).length}</span>
            </TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('smsOverview.search')} aria-label={t('smsOverview.search')} className="xl:max-w-sm" />
      </div>
      {isError ? <p role="alert" className="text-destructive">{t('smsOverview.error')}</p> :
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t('smsOverview.companies')}</TableHead><TableHead>{t('smsOverview.person')}</TableHead>
            <TableHead>{t('smsOverview.phone')}</TableHead><TableHead>{t('smsOverview.status')}</TableHead><TableHead>{t('smsOverview.updated')}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading || visible.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t(isLoading ? 'smsOverview.loading' : 'smsOverview.empty')}</TableCell></TableRow> :
              visible.map(row => <TableRow key={row.userId}>
                <TableCell className="min-w-40">{row.companies.map(company => <Link key={company.id} to={`/tenants/${company.id}`} className="block py-1 text-primary hover:underline">{company.name}</Link>)}</TableCell>
                <TableCell><div>{row.name}</div><div className="text-xs text-muted-foreground break-all">{row.email}</div></TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{row.phone ?? '—'}</TableCell>
                <TableCell><Badge variant={row.status === 'enabled' ? 'default' : 'secondary'} className="whitespace-nowrap">{t(`smsOverview.${row.status}`)}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString(i18n.language === 'da' ? 'da-DK' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</TableCell>
              </TableRow>)}
          </TableBody>
        </Table>}
    </div>
  </AppLayout>;
}