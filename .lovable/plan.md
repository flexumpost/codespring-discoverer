

## Tilføj liste over forsendelser i e-mails

### Problem
Når en e-mail sendes om ny forsendelse, indeholder den kun template-teksten med ét stempelnummer. Brugeren ønsker en konkret liste over hvilke breve der er modtaget, med forsendelsesnummer og afsender.

### Løsning

**Tilgang**: I edge-funktionen henter vi de seneste ubehandlede mail_items for lejeren og bygger en HTML-liste, som indsættes i e-mailen efter template-brødteksten.

### Ændringer

**1. `supabase/functions/send-new-mail-email/index.ts`**

Efter tenant-opslag (linje ~95), tilføj en query der henter nylige mail_items for denne tenant med status `received` (eller alle fra i dag):

```sql
SELECT stamp_number, sender_name, mail_type 
FROM mail_items 
WHERE tenant_id = $tenant_id AND status = 'received'
ORDER BY created_at DESC
```

Byg en HTML-liste fra resultaterne:
```html
<p><strong>Du har modtaget følgende forsendelser:</strong></p>
<ul>
  <li>#1234 — fra: Firma A</li>
  <li>#1235 — fra: Firma B</li>
</ul>
```

Indsæt denne `itemsListHtml` i `bodyHtml` EFTER template-brødteksten, og send den som del af det eksisterende `bodyHtml`-prop til alle tre email-templates (NewShipmentEmail, WelcomeShipmentEmail).

**2. Email-templates** (`new-shipment.tsx`, `welcome-shipment.tsx`)

Ingen ændringer nødvendige — listen indlejres allerede i `bodyHtml` via `dangerouslySetInnerHTML`.

### Teknisk detalje

- Listen vises kun for `new_shipment` og `welcome_shipment` slugs (ikke for `new_scan` eller `shipment_dispatched`)
- Hvis der ingen items findes, vises ingen liste
- Stempelnummer vises som `#1234`, og afsender vises som "fra: [afsender]". Hvis afsender mangler, vises "Ukendt afsender"
- Listen styles med inline CSS for e-mail-kompatibilitet

### Deployment
Edge-funktionen `send-new-mail-email` redeployes efter ændringen.

