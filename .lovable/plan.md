

## Operatør-indstillinger med tabs: Operatører + Priser og betingelser

### Overblik

SettingsPage viser i dag lejer-indstillinger. For operatører skal siden i stedet vise to faner:

1. **Operatører** — liste over alle operatører (fra `user_roles` + `profiles`) med mulighed for at oprette nye
2. **Priser og betingelser** — redigerbare prisfelter for alle tre pakker (Lite, Standard, Plus) for både breve og pakker

### Database-ændringer

Oprette en ny tabel `pricing_settings` til at gemme redigerbare priser:

```sql
CREATE TABLE pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,           -- 'Lite', 'Standard', 'Plus'
  category text NOT NULL,       -- 'mail', 'package'
  field_key text NOT NULL,      -- f.eks. 'ekstraScanning', 'haandteringsgebyr'
  field_value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tier, category, field_key)
);

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

-- Alle kan læse
CREATE POLICY "Anyone can read pricing" ON pricing_settings FOR SELECT TO authenticated USING (true);
-- Kun operatører kan ændre
CREATE POLICY "Operators manage pricing" ON pricing_settings FOR ALL TO authenticated USING (is_operator()) WITH CHECK (is_operator());
```

Seed med standardværdierne fra `MAIL_PRICING` og `PACKAGE_PRICING`.

Oprettelse af nye operatører sker ved at:
1. Oprette en bruger via `supabase.auth.admin` (kræver service role) — implementeres som edge function
2. Indsætte en rolle i `user_roles` med `role = 'operator'`

En edge function `create-operator` modtager email + password + full_name og opretter brugeren + rollen.

### Kode-ændringer

| Fil | Ændring |
|---|---|
| `src/pages/SettingsPage.tsx` | Tilføj rolle-check: operatører ser tabs-baseret UI, lejere ser nuværende indhold |
| `src/components/OperatorSettingsTabs.tsx` | Ny komponent med Tabs: "Operatører" og "Priser og betingelser" |
| `src/components/OperatorsList.tsx` | Ny: henter operatører fra `user_roles` + `profiles`, viser liste + "Opret operatør"-dialog |
| `src/components/PricingSettingsEditor.tsx` | Ny: henter `pricing_settings`, viser redigerbare felter per pakke, gemmer ændringer |
| `src/components/PricingOverview.tsx` | Opdater til at hente priser fra `pricing_settings`-tabellen i stedet for hardcodede konstanter |
| `supabase/functions/create-operator/index.ts` | Ny edge function: opretter bruger + operator-rolle |

### Operatører-fanen

- Tabel med kolonnerne: Navn, Email
- Knap "Opret operatør" åbner en dialog med felter: Fulde navn, Email, Adgangskode
- Dialog kalder `create-operator` edge function

### Priser og betingelser-fanen

- Tre sektioner (Lite, Standard, Plus), hver med redigerbare felter for breve og pakker
- Inputfelter med nuværende værdier fra databasen
- Gem-knap per sektion
- Ændringer reflekteres automatisk i lejerens prisoversigt

