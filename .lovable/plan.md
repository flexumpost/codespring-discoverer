

## Velkomst e-mail: Brug React Email skabelon

### Problem
Velkomst e-mailen sender rå HTML fra `email_templates`-tabellen, mens auth-emails bruger brandede React Email-skabeloner med Flexum-logo og ensartet styling.

### Løsning
Opret en React Email-skabelon til velkomst-email der matcher auth-skabelonernes stil, og opdater `send-welcome-email` til at rendere den via React Email — mens subject/body fra databasen stadig bruges som indholdskilde.

### Ændringer

**1. Ny fil: `supabase/functions/_shared/email-templates/welcome.tsx`**
- Samme layout som de øvrige skabeloner: Flexum-logo, navy knap, dansk tekst
- Props: `name`, `subject`, `bodyHtml` (fra databasens template med placeholders erstattet)
- Wrapper-skabelon der indsætter body-indholdet i det brandede layout

**2. Opdater `supabase/functions/send-welcome-email/index.ts`**
- Tilføj `deno.json` med JSX-config (ligesom `auth-email-hook`)
- Importer React og `renderAsync` fra `@react-email/components`
- Importer `WelcomeEmail` fra `_shared/email-templates/welcome.tsx`
- Efter placeholder-erstatning: render skabelonen til HTML via `renderAsync`
- Send den renderede HTML i stedet for rå database-body
- Brug email-køen (`enqueue_email`) i stedet for direkte API-kald, så velkomst-emails også får retry-logik

**3. Ny fil: `supabase/functions/send-welcome-email/deno.json`**
- JSX-konfiguration identisk med `auth-email-hook/deno.json`

| Fil | Ændring |
|---|---|
| `_shared/email-templates/welcome.tsx` | Ny React Email-skabelon |
| `send-welcome-email/deno.json` | JSX-config |
| `send-welcome-email/index.ts` | Render via React Email + brug email-kø |

