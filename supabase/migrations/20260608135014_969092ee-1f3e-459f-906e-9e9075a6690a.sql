CREATE TABLE public.onboarding_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX onboarding_tokens_email_idx ON public.onboarding_tokens(email);

GRANT ALL ON public.onboarding_tokens TO service_role;

ALTER TABLE public.onboarding_tokens ENABLE ROW LEVEL SECURITY;
-- No policies: table is only accessed via service_role in edge functions.