## Mål
Tilføj mulighed for at genafsende alle failed/dlq emails i `email_send_log` for templates `recovery` (password reset) og `welcome`, når Resend-domænet er rettet.

## Løsning: Knap i Email Log fanen

En "Genprøv failed emails" knap i `EmailLogTab.tsx` (kun synlig for operators), som kalder en ny edge function der finder failed emails og genafsender dem.

## Filer

### Ny: `supabase/functions/retry-failed-emails/index.ts`
- Auth: kræver operator (via `is_operator()` RPC, samme mønster som `get-email-log`)
- Henter alle rows fra `email_send_log` hvor:
  - `status IN ('failed', 'dlq')`
  - `template_name IN ('recovery', 'welcome', 'password_reset', 'welcome_email')` (matcher faktiske template-navne i log)
  - Dedupliker på `recipient_email` (kun seneste failed pr. modtager — undgå dubletter hvis samme bruger fejlede flere gange)
  - Spring over hvis modtager allerede har en nyere `sent` row (problemet allerede løst)
- For hver unik modtager:
  - **recovery** → kald `request-password-reset` edge function med email
  - **welcome** → kald `send-welcome-email` edge function med tenant lookup på email
- Returnér `{ retried: N, skipped: N, failed: N, details: [...] }`

### Opdateret: `src/components/EmailLogTab.tsx`
- Tilføj "Genprøv fejlede emails" knap øverst (ved siden af søgefelt)
- Confirm-dialog med antal failed emails der bliver genafsendt
- Loading-state mens kaldet kører
- Toast med resultat + refetch af log

## Tekniske noter
- Genbrug eksisterende `request-password-reset` og `send-welcome-email` funktioner — ingen ændringer dér
- Welcome-emails kræver tenant lookup via `contact_email` for at hente nødvendige felter
- Dedup på recipient sikrer at gentagne fejl for samme bruger kun trigger ét nyt forsøg
- Tjek mod nyere `sent` status forhindrer dubletter hvis user allerede har modtaget en email siden failure
- Ingen DB schema ændringer nødvendige
