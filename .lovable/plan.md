

## Fix: "Sæt din adgangskode"-link peger på forkert domæne

### Problem
I `supabase/functions/send-new-mail-email/index.ts` linje 141 er `loginUrl` hardkodet til:
```
https://codespring-discoverer.lovable.app/login
```

Denne URL bruges som fallback i welcome-emails og som `loginUrl` i NewShipmentEmail og ShipmentDispatchedEmail. Den burde pege på `https://post.flexum.dk/login`.

`origin` (linje 147) er allerede korrekt sat til `https://post.flexum.dk`, men `loginUrl` blev aldrig opdateret.

### Ændring

**`supabase/functions/send-new-mail-email/index.ts` — linje 141**

Ændr:
```typescript
const loginUrl = "https://codespring-discoverer.lovable.app/login";
```
Til:
```typescript
const loginUrl = "https://post.flexum.dk/login";
```

Deploy `send-new-mail-email` efter ændringen.

