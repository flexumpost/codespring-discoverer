import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeSmsPhone } from '../../supabase/functions/_shared/new-mail-summary';
export function useSmsPreferences() {
  const { user, role } = useAuth();
  const client = useQueryClient();
  const key = ['sms-preferences', user?.id];
  const query = useQuery({ queryKey: key, enabled: !!user && role === 'tenant', queryFn: async () => {
    if (!user) return null;
    const { data, error } = await supabase.from('sms_preferences').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data;
  } });
  const save = useMutation({ mutationFn: async ({ enabled, phone }: { enabled: boolean; phone: string }) => {
    if (!user) throw new Error('Unauthorized');
    const number = normalizeSmsPhone(phone);
    if (enabled && !number) throw new Error('invalid_phone');
    const { error } = await supabase.from('sms_preferences').upsert({ user_id: user.id, enabled, phone_number: number, updated_at: new Date().toISOString() });
    if (error) throw error;
  }, onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  return { ...query, save };
}