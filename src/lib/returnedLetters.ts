import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
export { parseReturnShipmentNumbers, returnBlocksLetters, returnDispatchNotice } from '../../supabase/functions/_shared/returned-letter-rules';
export async function returnAction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('returned-letter', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      throw new Error(details?.error || error.message);
    }
    throw error;
  }
  return data;
}