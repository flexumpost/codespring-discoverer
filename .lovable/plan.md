

## Fix: OfficeRnD OAuth-token-anmodning bruger forkert Content-Type

### Problem
Gebyret for brev 2976 (50 kr. afhentning, Lite-lejer "DE PERSONLIGE HJÆLPERE") blev ikke overført til OfficeRnD. Synkroniseringsloggen viser status "pending" uden fejlbesked.

**Årsag**: OfficeRnD's OAuth-endpoint (`identity.officernd.com/oauth/token`) kræver `application/x-www-form-urlencoded`, men funktionen sender `application/json`. OfficeRnD returnerer: `"Invalid request: content must be application/x-www-form-urlencoded"`.

**Sekundært problem**: Fejlhåndteringen i catch-blokken forsøger at parse request-body'en igen via `req.clone().json()`, men req er allerede forbrugt. Det returnerer `null` for `mail_item_id`, så fejlen logges aldrig — den eksisterende "pending" log-entry opdateres heller ikke.

### Løsning

**Fil**: `supabase/functions/sync-officernd-charge/index.ts`

**1. Ret `getOfficeRndToken` til at bruge URL-encoded format (linje 91-101):**

```typescript
async function getOfficeRndToken(clientId: string, clientSecret: string, orgSlug: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: `${orgSlug}/charges.write ${orgSlug}/members.read`,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch("https://identity.officernd.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  // ... rest unchanged
```

**2. Ret fejlhåndteringen — gem `mail_item_id` tidligt og opdater pending-loggen i catch:**

Gem `mail_item_id` i en variabel uden for try-blokken, og i catch: opdater den eksisterende pending log-entry i stedet for at indsætte en ny.

### Verifikation
Efter deploy kan vi kalde funktionen igen for brev 2976 for at bekræfte at gebyret overføres korrekt.

