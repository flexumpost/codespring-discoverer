-- Restrict email_templates SELECT to operators only
DROP POLICY IF EXISTS "Authenticated can read email_templates" ON public.email_templates;

CREATE POLICY "Operators read email_templates"
ON public.email_templates
FOR SELECT
TO authenticated
USING (public.is_operator());

-- Fix mutable search_path on internal functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;