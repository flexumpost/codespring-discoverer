

## Plan: 3 rettelser

### 1. Synlig knapfarve i invite-email

Knappen i invite.tsx (og alle andre email-skabeloner) bruger `hsl(222.2, 47.4%, 11.2%)` som er næsten sort — usynlig i mange klienter med hvid baggrund. Skift til en tydelig blå farve f.eks. `#1a73e8` (Google-blå) eller en Flexum-brandfarve som `#00aaeb` (den farve der allerede bruges til "Plus" badge).

**Filer der ændres:**
- `supabase/functions/_shared/email-templates/invite.tsx` — button backgroundColor → `#00aaeb`
- `supabase/functions/_shared/email-templates/signup.tsx` — samme
- `supabase/functions/_shared/email-templates/recovery.tsx` — samme
- `supabase/functions/_shared/email-templates/magic-link.tsx` — samme
- `supabase/functions/_shared/email-templates/email-change.tsx` — samme
- `supabase/functions/_shared/email-templates/welcome.tsx` — samme
- Redeploy `auth-email-hook` og `send-welcome-email`

### 2. Tilføj "Kontaktperson" felt i Opret ny lejer-dialogen

Tabellen `tenants` har allerede kolonnen `contact_name`. Dialogen i `TenantsPage.tsx` mangler blot feltet.

**Ændringer i `src/pages/TenantsPage.tsx`:**
- Tilføj state: `contactName`
- Tilføj Input-felt "Kontaktperson" mellem virksomhedsnavn og kontakt-email
- Send `contact_name` med i INSERT-kaldet
- Send `contactName` som `full_name` til `create-tenant-user` (i stedet for `companyName`)
- Nulstil feltet ved lukning

### 3. Fix: Set-password-siden viser ikke adgangskodeform

Problemet er at når brugeren klikker invite-linket, logger Supabase dem automatisk ind og redirecter til `/set-password`. Men `AuthProvider` + `TenantProvider` detekterer sessionen, og når brugeren navigerer til `/` (f.eks. via en redirect eller manuelt), viser `ShippingAddressGuard` sig FØR password-formularen.

Det egentlige problem: `SetPasswordPage` tjekker for `SIGNED_IN` eller `PASSWORD_RECOVERY` event — men med invite-flow er brugeren allerede signed in inden komponenten mountes. `getSession()` returnerer en session, og `isReady` sættes korrekt. Men brugeren har allerede fået sat et midlertidigt password af Supabase internt, og `updateUser({ password })` virker kun under en `PASSWORD_RECOVERY` session.

**Fix i `SetPasswordPage.tsx`:**
- Tjek URL-hash for `type=invite` ELLER `type=recovery` tokens
- Hvis hash indeholder `access_token`, kald `setSession()` eksplicit for at sikre sessionen er aktiv
- Vis altid password-formularen når siden tilgås (fjern "vent venligst" state og vis formularen direkte, da invite-links altid indeholder en gyldig session)
- Tilføj redirect-guard: hvis bruger allerede har sat password og navigerer hertil, redirect til `/`

