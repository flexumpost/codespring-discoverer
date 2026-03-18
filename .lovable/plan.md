

## Plan: "Din pakke er sendt" e-mail med sporingslink

### Problem
Når operatøren markerer pakker som sendt fra forsendelsessiden, sendes der ingen e-mailnotifikation til lejeren. Der skal sendes en e-mail med pakkeinformation, sporingsknap og "Gå til postkasse"-knap.

### Ændringer

**1. Ny React Email-skabelon** (`supabase/functions/_shared/email-templates/shipment-dispatched.tsx`)
- Ny skabelon med: overskrift, brødtekst fra DB-template, pakkeinformation (stempelnummer, type)
- "Spor din pakke"-knap (blå, kun vist når tracking_number er til stede) → linker til `tracking.postnord.com/...`
- "Gå til postkasse"-knap → linker til login-URL
- Samme branding som eksisterende skabeloner (Flexum-logo, bulletproof buttons med VML-fallback)

**2. Opdater edge function** (`supabase/functions/send-new-mail-email/index.ts`)
- Accepter ekstra parametre: `tracking_number`, `stamp_number` (allerede der)
- Når `template_slug === "shipment_dispatched"`: brug den nye `ShipmentDispatchedEmail`-skabelon i stedet for `NewShipmentEmail`
- Indsæt `{{tracking_number}}` placeholder-support i subject/body

**3. DB-migration: indsæt template-række**
- Indsæt `shipment_dispatched`-skabelon i `email_templates` med passende dansk subject og body-tekst (audience: `tenant`)

**4. Trigger e-mail fra ShippingPrepPage** (`src/pages/ShippingPrepPage.tsx`)
- I `sendMutation.onSuccess` (eller efter hvert succesfuldt update i mutationFn): kald `send-new-mail-email` for hver pakke med `template_slug: "shipment_dispatched"` og `tracking_number`
- Behøver kun for pakker (tab === "pakke"), men også for breve sendt med DAO

### Ændrede filer
- `supabase/functions/_shared/email-templates/shipment-dispatched.tsx` — ny fil
- `supabase/functions/send-new-mail-email/index.ts` — udvid med ny skabelon-support
- `src/pages/ShippingPrepPage.tsx` — tilføj e-mail-trigger efter afsendelse
- DB-migration — indsæt `shipment_dispatched` template-række

