

## Zoho webhook: Standardhandling + velkomst-e-mail

### Ændringer

**1. Edge function: `zoho-crm-webhook/index.ts`**

- Tilføj `default_mail_action: "send"` i tenant-insert (sætter standardhandling for breve til "Forsendelse")
- Efter tenant er oprettet: hvis `contactEmail` findes, send velkomst-e-mail via den eksisterende `send-welcome-email` logik (Resend API + welcome-template fra `email_templates`-tabellen)
  - Hent welcome-skabelonen fra `email_templates` (slug: `welcome`)
  - Render med `WelcomeEmail` React Email-komponenten (uden recovery link, da brugeren endnu ikke har en konto)
  - Send via Resend API
  - Log i `email_send_log` og opdater `welcome_email_sent_at` på lejeren

Ingen database-migration nødvendig — `default_mail_action` og `welcome_email_sent_at` kolonnerne eksisterer allerede.

### Tekniske detaljer

Koden genbruger den eksisterende `WelcomeEmail`-template og `email_templates`-tabellens welcome-skabelon. E-mailen sendes uden recovery-link (da der ikke oprettes en auth-bruger i dette flow), så modtageren får en "Log ind"-knap i stedet for "Sæt din adgangskode".

