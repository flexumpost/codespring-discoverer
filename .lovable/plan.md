## Mål

Gør det tydeligt for både lejere og operatører at:
- **Ekstra scanning:** gebyret er **pr. brev**.
- **Ekstra afhentning:** gebyret er **pr. afhentning** (flere breve kan afhentes samlet, men der pålægges kun ét gebyr).

## Ændringer

1. **`src/components/PricingOverview.tsx`** — opdatér tekstværdierne for `ekstraScanning` og `ekstraAfhentning` for alle tre tiers (Lite, Standard, Plus) samt afsnittet i `forklaring`, så det fremgår tydeligt:
   - Lite: `"50 kr. pr. brev — kan scannes tirsdag eller torsdag"` og `"50 kr. pr. afhentning — kan afhentes tirsdag eller torsdag (Skal bookes)"`.
   - Standard: `"30 kr. pr. brev — kan scannes alle hverdage"` og `"30 kr. pr. afhentning — kan afhentes tirsdag eller torsdag (Skal bookes)"`.
   - Plus: uændret ("Inkluderet …").
   - Tilføj tilsvarende præcisering i `forklaring`-Markdown ("gebyret afregnes pr. brev" / "pr. afhentning uanset antal breve").

2. **Migration for `pricing_settings`** — opdatér `field_value` for de eksisterende rækker, så operatøren i Indstillinger → Priser ser samme formulering som standard:
   - `Lite/mail/ekstraScanning` → `"50 kr. pr. brev"`
   - `Lite/mail/ekstraAfhentning` → `"50 kr. pr. afhentning (Skal bookes)"`
   - `Standard/mail/ekstraScanning` → `"30 kr. pr. brev"`
   - `Standard/mail/ekstraAfhentning` → `"30 kr. pr. afhentning (Skal bookes)"`
   - Plus-rækker uændret (`"0 kr."`).

3. **`src/pages/OperatorDashboard.tsx`** (kun kosmetisk visning i eventuel prisoversigt) — hvis værdier vises direkte, opdatér til samme format: `"50 kr. pr. brev"` / `"50 kr. pr. afhentning"` osv.

Ingen ændringer i beregningslogik eller i handlings-dialogen (`mailActions.ts`) — kun tekst.

## Tekniske detaljer

- `PricingOverview.tsx` bruger en hardcoded `TIER_DATA`-map — teksten redigeres direkte.
- `pricing_settings`-tabellen indeholder de redigérbare værdier operatøren kan overskrive; migration bruger `UPDATE ... WHERE tier=... AND field_key=...`.
- Ingen i18n-nøgler skal ændres (labels som "Ekstra scanning" / "Ekstra afhentning" er stadig korrekte).
