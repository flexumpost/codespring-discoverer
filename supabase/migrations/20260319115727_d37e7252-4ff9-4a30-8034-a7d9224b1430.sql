CREATE TABLE public.scheduled_type_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  new_tenant_type_id uuid NOT NULL REFERENCES public.tenant_types(id),
  effective_date date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz,
  UNIQUE (tenant_id, effective_date)
);

ALTER TABLE public.scheduled_type_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators manage scheduled changes"
  ON public.scheduled_type_changes FOR ALL
  TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());