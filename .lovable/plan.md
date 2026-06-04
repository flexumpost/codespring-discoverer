### Problem
På lejer-detaljesiden vises knappen "Gensend invitation" kun når `tenant.user_id` allerede findes (linje 624). Det betyder, at lejere uden oprettet bruger — som Nordtræ Entreprise ApS (`fmb@nordt.dk`) — ikke har mulighed for at få tilsendt en invitation.

### Ændring
Fjern tjekket for `tenant.user_id` i visningsbetingelsen for `ResendInviteButton`, så knappen vises så længe der er en `contact_email`.

**Fil:** `src/pages/TenantDetailPage.tsx`
**Linje:** 624
**Før:**
```tsx
{tenant.contact_email && tenant.user_id && (
```
**Efter:**
```tsx
{tenant.contact_email && (
```

### Konsekvens
- Lejere uden bruger får nu vist "Gensend invitation" → kaldet går til `create-tenant-user`, som opretter auth-brugeren og sender invitationsmail.
- Lejere med eksisterende bruger opfører sig uændret (knappen var der i forvejen).
- Triggeren `link_user_to_tenant` sørger automatisk for at knytte alle tre Nordt-virksomheder til samme bruger, når invitationen accepteres.