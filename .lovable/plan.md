

## Send email ved ændring af "Ubetalt faktura" status

### Oversigt
Når operatøren markerer/afmarkerer "Ubetalt faktura" for en lejer, sendes en e-mail til lejeren via den eksisterende `send-new-mail-email` Edge Function med to nye email-skabeloner.

### Ændringer

**1. Database: To nye email-skabeloner**

Indsæt to nye rækker i `email_templates`:
- `invoice_unpaid` (audience: "tenant") — Emne: "Forsendelser sat på pause" — Besked om at forsendelser ikke behandles pga. ubetalt faktura.
- `invoice_paid` (audience: "tenant") — Emne: "Forsendelser genoptaget" — Besked om at behandling er genoptaget.

**2. `supabase/functions/send-new-mail-email/index.ts`**

Udvid funktionen til at håndtere de nye skabeloner:
- Acceptér et nyt optional felt `invoice_status_change` i request body.
- Når `template_slug` er `invoice_unpaid` eller `invoice_paid`, render en simpel e-mail (genbruge `NewShipmentEmail`-layoutet) med skabelonens indhold.
- Kræver ikke `mail_type` eller `stamp_number` — disse felter er valgfrie.

**3. `src/pages/TenantsPage.tsx`**

I `onCheckedChange`-handleren for ubetalt faktura-checkboxen:
- Efter succesfuld database-opdatering, kald `supabase.functions.invoke("send-new-mail-email", { body: { tenant_id: tenant.id, template_slug: newVal ? "invoice_unpaid" : "invoice_paid" } })`.
- Vis en toast ved succes/fejl.

### Tekniske detaljer
- Genbruger den eksisterende Edge Function og email-infrastruktur (Resend).
- Skabelonerne bruger `{{company_name}}` og `{{name}}` placeholders som de eksisterende.
- Ingen ny Edge Function nødvendig.

