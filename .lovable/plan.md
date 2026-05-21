# Problem

Når flere breve afsendes til samme lejer i samme batch (fx Nordværk: #3232 og #3233), kalder `ShippingPrepPage` `send-new-mail-email` én gang pr. brev. Lejeren modtager derfor én "shipment_dispatched" mail pr. forsendelse i stedet for én samlet mail.

# Løsning

Konsolidér email-udsendelsen pr. lejer i selve afsendelses-flowet, og lad mailen liste alle stempelnumre der er med i samme fysiske kuvert.

## 1. `src/pages/ShippingPrepPage.tsx`
- Efter loop'et der opdaterer `mail_items`, gruppér `sentItems` pr. `tenant_id`.
- Kald `send-new-mail-email` én gang pr. lejer med:
  - `tenant_id`
  - `template_slug: "shipment_dispatched"`
  - `stamp_numbers: number[]` (alle stempelnumre i batchen for den lejer)
  - `tracking_numbers: string[]` (alle tracking-numre, kun PostNord)
  - `mail_type` (fra første item — bruges kun til label)
- Behold 300ms throttle mellem hver lejer (ikke pr. brev).

## 2. `supabase/functions/send-new-mail-email/index.ts`
- Acceptér nye valgfri felter `stamp_numbers: number[]` og `tracking_numbers: string[]` i request body. Bevar `stamp_number` / `tracking_number` for bagudkompatibilitet.
- Når `template_slug === "shipment_dispatched"`:
  - Spring den eksisterende `mail_items`-query (`status='ny'`) over — dispatched items har ikke status `ny`.
  - Render `ShipmentDispatchedEmail` med nye props `stampNumbers` og `trackingNumbers` (arrays). Hvis kun ét stempelnummer, opfør sig som før.
- Erstat `{{stamp_number}}` i subject/body med komma-separeret liste når flere stempler er angivet.

## 3. `supabase/functions/_shared/email-templates/shipment-dispatched.tsx`
- Tilføj props `stampNumbers?: string[]` og `trackingNumbers?: string[]`.
- Hvis `stampNumbers.length > 1`: render listen som flere `Text`-linjer i `infoBox` ("Stempelnumre: #3232, #3233").
- Hvis `trackingNumbers.length > 1`: render én "Spor din pakke"-knap pr. tracking-nummer (eller en linje med link pr. nummer). Hvis kun ét: uændret.
- Bevar single-værdi opførsel når kun ét nummer leveres.

## Resultat
Lejeren får én mail med begge stempelnumre (#3232 og #3233) når begge breve afsendes i samme batch. OfficeRnD-batch-sync er allerede konsolideret pr. lejer og påvirkes ikke.

## Filer
- `src/pages/ShippingPrepPage.tsx`
- `supabase/functions/send-new-mail-email/index.ts`
- `supabase/functions/_shared/email-templates/shipment-dispatched.tsx`

Ingen DB-ændringer.
