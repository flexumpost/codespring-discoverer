

## Problem

Der sendes **to separate e-mails** når en lejer oprettes:
1. **Invite-e-mail** (via auth-email-hook, notify.flexum.dk) — har "Acceptér invitation"-link men generisk tekst
2. **Velkomst-e-mail** (via Resend, kontakt@flexum.dk) — har Flexum-branding og velkomsttekst men **intet login-link**

Brugeren ser kun velkomst-e-mailen (billedet) som mangler invitationslinket. Invite-e-mailen sendes separat og kan havne i spam eller blive overset.

## Løsning: Kombinér til én e-mail

Slå de to e-mails sammen til én velkomst-e-mail der **både** byder velkommen **og** indeholder det sikre link til at sætte adgangskode.

### Ændringer

| Fil | Ændring |
|---|---|
| `supabase/functions/create-tenant-user/index.ts` | Brug `createUser` med `email_confirm: false` i invite-mode i stedet for `inviteUserByEmail()`. Generér et password-reset-link via `generateLink({ type: 'recovery' })` og returnér linket til klienten |
| `supabase/functions/send-welcome-email/index.ts` | Modtag det genererede link og inkludér det i velkomst-e-mailen |
| `supabase/functions/_shared/email-templates/welcome.tsx` | Tilføj en prominent "Sæt din adgangskode"-knap med linket |
| `src/pages/TenantsPage.tsx` | Send det returnerede link videre til `send-welcome-email` |

### Flow

```text
Operatør opretter lejer
        │
        ▼
create-tenant-user: opretter bruger + genererer recovery-link
        │
        ▼
send-welcome-email: sender ÉN e-mail med velkomsttekst + "Sæt adgangskode"-knap
        │
        ▼
Lejer klikker link → /set-password → logger ind
```

### Resultat
- Lejeren modtager **én** branded e-mail fra kontakt@flexum.dk
- E-mailen indeholder velkomsttekst fra skabelonen OG et sikkert link til at sætte adgangskode
- Ingen forvirring med to separate e-mails

