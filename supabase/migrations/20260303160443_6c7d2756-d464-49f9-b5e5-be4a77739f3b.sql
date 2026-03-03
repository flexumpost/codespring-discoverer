
CREATE TABLE public.pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  category text NOT NULL,
  field_key text NOT NULL,
  field_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tier, category, field_key)
);

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pricing" ON public.pricing_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators can insert pricing" ON public.pricing_settings FOR INSERT TO authenticated WITH CHECK (public.is_operator());
CREATE POLICY "Operators can update pricing" ON public.pricing_settings FOR UPDATE TO authenticated USING (public.is_operator());
CREATE POLICY "Operators can delete pricing" ON public.pricing_settings FOR DELETE TO authenticated USING (public.is_operator());

-- Seed mail pricing
INSERT INTO public.pricing_settings (tier, category, field_key, field_value) VALUES
  ('Lite', 'mail', 'forklaring', 'Scanning fortages gratis den første torsdag i måneden. Afhentning kan ske gratis den første torsdag i måneden, skal bookes. Forsendelse er gratis, men tillægges porto.'),
  ('Lite', 'mail', 'forsendelsesdag', 'Første torsdag i måneden'),
  ('Lite', 'mail', 'ekstraForsendelse', '50 kr. pr. forsendelse + porto'),
  ('Lite', 'mail', 'ekstraScanning', '50 kr.'),
  ('Lite', 'mail', 'ekstraAfhentning', '50 kr. (Skal bookes)'),
  ('Standard', 'mail', 'forklaring', 'Scanning fortages gratis hver torsdag. Afhentning kan ske gratis den hver torsdag, skal bookes. Forsendelse sker hver torsdag og tillægges porto.'),
  ('Standard', 'mail', 'forsendelsesdag', 'Hver torsdag'),
  ('Standard', 'mail', 'ekstraForsendelse', 'Ingen ekstra forsendelse'),
  ('Standard', 'mail', 'ekstraScanning', '30 kr.'),
  ('Standard', 'mail', 'ekstraAfhentning', '30 kr. (Skal bookes)'),
  ('Plus', 'mail', 'forklaring', 'Scanning fortages gratis alle hverdage. Afhentning kan ske gratis på alle hverdage, skal bookes. Forsendelse sker hver torsdag, gratis porto.'),
  ('Plus', 'mail', 'forsendelsesdag', 'Hver torsdag'),
  ('Plus', 'mail', 'ekstraForsendelse', 'Ingen ekstra forsendelse'),
  ('Plus', 'mail', 'ekstraScanning', '0 kr.'),
  ('Plus', 'mail', 'ekstraAfhentning', '0 kr. (Skal bookes)'),
  -- Package pricing
  ('Lite', 'package', 'haandteringsgebyr', '50 kr.'),
  ('Lite', 'package', 'afhentning', 'Afhentning kan ske hver torsdag efter aftale (Skal bookes)'),
  ('Lite', 'package', 'forsendelse', 'Porto tillægges'),
  ('Standard', 'package', 'haandteringsgebyr', '30 kr.'),
  ('Standard', 'package', 'afhentning', 'Afhentning kan ske hver torsdag efter aftale (Skal bookes)'),
  ('Standard', 'package', 'forsendelse', 'Porto tillægges'),
  ('Plus', 'package', 'haandteringsgebyr', '10 kr.'),
  ('Plus', 'package', 'afhentning', 'Afhentning kan ske efter aftale (Skal bookes)'),
  ('Plus', 'package', 'forsendelse', 'Porto tillægges');
