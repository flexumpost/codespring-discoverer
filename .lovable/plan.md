

## Sikker onboarding af nye lejere

### Nuværende flow
1. Operatør opretter lejer (virksomhed) med firmanavn, e-mail og type
2. Velkomst-e-mail sendes via Resend med et link til login-siden
3. **Problem**: Der oprettes ingen brugerkonto automatisk — lejeren kan ikke logge ind

### Anbefalet løsning: Invite-baseret onboarding med magic link

Når operatøren opretter en lejer, skal systemet automatisk:

1. **Oprette en brugerkonto** via `auth.admin.inviteUserByEmail()` (Supabase Admin API)
2. **Tildele rollen `tenant`** og linke brugeren til virksomheden
3. **Sende en branded invite-e-mail** med et sikkert engangslinklink, der lader lejeren sætte sin adgangskode

Dette er sikrere end at operatøren vælger en adgangskode, fordi lejeren selv sætter sin kode.

### Teknisk plan

| Fil | Ændring |
|---|---|
| `supabase/functions/create-tenant-user/index.ts` | Tilføj en `invite`-mode der bruger `inviteUserByEmail()` i stedet for `createUser()` med password |
| `src/pages/TenantsPage.tsx` | Efter oprettelse af lejer, kald `create-tenant-user` i invite-mode for automatisk kontoprettelse |
| `supabase/functions/_shared/email-templates/invite.tsx` | Opdater invite-skabelonen med Flexum-branding og dansk tekst |
| `src/pages/Login.tsx` | Tilføj en `/reset-password`-side så brugeren kan sætte sin adgangskode via invite-linket |

### Flow for lejeren

```text
Operatør opretter lejer
        │
        ▼
System opretter brugerkonto (invite)
        │
        ▼
Lejer modtager e-mail med sikkert link
        │
        ▼
Lejer klikker link → sætter adgangskode
        │
        ▼
Lejer er logget ind på sin side
```

### Vigtige detaljer

- **Ingen adgangskoder i operatørens hænder** — lejeren sætter selv sin kode
- **Engangslinklink udløber** efter standardperioden (24 timer)
- Invite-e-mailen bruger den eksisterende auth-email-hook med Flexum-branding
- Den eksisterende `link_tenant_to_user`-trigger sikrer at virksomheden kobles til brugeren automatisk via `contact_email`
- Velkomst-e-mail-flowet kan beholdes som en separat, valgfri handling for eksisterende lejere

### Alternativ: Password-baseret (nuværende `create-tenant-user`)
Det nuværende flow kræver at operatøren vælger en adgangskode. Dette er mindre sikkert og kræver at adgangskoden kommunikeres ud-of-band. Invite-flowet er at foretrække.

