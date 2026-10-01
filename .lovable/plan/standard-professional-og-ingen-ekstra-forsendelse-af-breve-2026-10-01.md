# Standard = Professional, og ingen "ekstra forsendelse" af breve

## Hvad der ændres

1. **Standard får samme betingelser som Professional**
  - Scanning: gratis mandag og torsdag
  - Afhentning: gratis mandag og torsdag (begge dage markeret som gratis i lejerens bookingkalender)
  - Forsendelse af breve: mandag og torsdag, porto inkluderet (der vælges og opkræves ikke porto)
  - Pakker: uændret (sendes løbende, 30 kr. + porto)
  - Gælder alle 91 eksisterende Standard-lejere med det samme.
2. **"Ekstra forsendelse" af breve fjernes for alle løsninger**
  - Breve sendes kun mandag og torsdag, så muligheden vises ikke længere for lejeren, og der overføres aldrig et gebyr for den til OfficeRnD.
  - De eneste ekstra handlinger er **ekstra scanning** og **ekstra afhentning**.
  - Lite kan stadig have ekstra forsendelse, da der kun sendes én gang pr måned.
  - Essential kan også have ekstra forsendelse, da breve sendes gratis sendes torsdag, men mandag vælges mod gebyr
3. **Executive og Plus: ekstra scanning og afhentning er altid gratis** (0 kr. alle hverdage) — tjekkes og rettes, hvor det ikke allerede er tilfældet.
4. **Professional og Standard: mandags-afhentning bliver gratis i både kalender og OfficeRnD** (lukker det tidligere åbne punkt).
5. **Tekster under "Priser og betingelser"** for Standard opdateres til de nye betingelser.

## Technical details

- `src/lib/tiers.ts` + `supabase/functions/_shared/tiers.ts`: tilføj "Standard" i `hasMondayAndThursday` og `lettersPortoIncluded`.
- `src/pages/TenantDashboard.tsx` (`getExtraActions`, `getItemFee`, kalenderens gratis-dage, `handleAction`) og `src/lib/mailActions.ts`: fjern `ekstra_forsendelse` som valgmulighed; brug `isFreeWeekday` til gratis scanning/afhentning; Executive/Plus = 0 kr.
- `src/pages/ShippingPrepPage.tsx`: ingen porto-dropdown/krav for Standard-breve (via `lettersPortoIncluded`); porto-valideringen undtager dem.
- `src/pages/OperatorDashboard.tsx`: `getShippingDate` følger automatisk mandag/torsdag via `hasMondayAndThursday`.
- `sync-officernd-charge` og `sync-officernd-charge-batch`: ingen porto for Standard-breve; ingen gebyr for ekstra forsendelse af breve; afhentning/scanning gratis på mandag+torsdag for Standard/Professional; altid gratis for Plus/Executive. Redeploy.
- Migration: opdater `pricing_settings`-tekster for Standard (forklaring, forsendelsesdag, ekstraScanning, ekstraAfhentning; fjern ekstraForsendelse-tekst for alle).
- Opdater projekt-hukommelse om pris/tier-regler.