
-- closed_days table
CREATE TABLE public.closed_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.closed_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read closed_days" ON public.closed_days
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operators manage closed_days" ON public.closed_days
  FOR ALL TO authenticated
  USING (is_operator())
  WITH CHECK (is_operator());

-- email_templates table
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read email_templates" ON public.email_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operators manage email_templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (is_operator())
  WITH CHECK (is_operator());

-- Seed default templates
INSERT INTO public.email_templates (slug, subject, body, audience) VALUES
  ('welcome', 'Velkommen til Flexum', 'Kære {{name}},\n\nVelkommen til Flexum! Vi glæder os til at håndtere din post.\n\nMed venlig hilsen\nFlexum', 'tenant'),
  ('new_shipment', 'Ny forsendelse modtaget', 'Kære {{name}},\n\nVi har modtaget en ny forsendelse til dig.\n\nMed venlig hilsen\nFlexum', 'tenant'),
  ('scan_ready', 'Scanning klar', 'Kære {{name}},\n\nDin forsendelse er blevet scannet og er klar til download.\n\nMed venlig hilsen\nFlexum', 'tenant'),
  ('pickup_confirmed', 'Afhentning bekræftet', 'Kære {{name}},\n\nDin afhentning er bekræftet til {{date}}.\n\nMed venlig hilsen\nFlexum', 'tenant'),
  ('pickup_reminder', 'Påmindelse om afhentning', 'Kære {{name}},\n\nDette er en påmindelse om din planlagte afhentning {{date}}.\n\nMed venlig hilsen\nFlexum', 'tenant'),
  ('operator_new_request', 'Ny anmodning fra lejer', 'Der er modtaget en ny anmodning fra {{name}}.\n\nType: {{type}}\n\nLog ind for at se detaljer.', 'operator');
