

## Diagnose: Hvorfor get-email-log returnerer 401

Problemet er i hvordan `supabase.functions.invoke()` kaldes i `EmailLogTab.tsx`:

```typescript
supabase.functions.invoke(`get-email-log?${params.toString()}`)
```

Query-parametrene bliver en del af funktionsnavnet. Infrastrukturen prøver at finde en funktion kaldet `get-email-log?offset=0&limit=50` — som ikke har `verify_jwt = false` i config.toml. Derfor afvises kaldet med 401 **før** funktionskoden overhovedet kører (bekræftet af logs der kun viser Boot/Shutdown, ingen applikationslogs).

Samme problem gælder `log-login` (som også returnerer 401 i network requests).

## Plan

**1. `src/components/EmailLogTab.tsx`** — Send params i body i stedet for query string
```typescript
const res = await supabase.functions.invoke("get-email-log", {
  body: { offset: page * PAGE_SIZE, limit: PAGE_SIZE, search: debouncedSearch || undefined },
});
```

**2. `supabase/functions/get-email-log/index.ts`** — Læs params fra request body (JSON) i stedet for URL searchParams

**3. `src/hooks/useAuth.tsx`** — Tilsvarende fix for `log-login` kaldet, sikr at funktionsnavnet er rent uden query params

**4. `supabase/functions/log-login/index.ts`** — Verificer at den læser fra body (ser ud til allerede at gøre det)

### Filer der ændres
- `src/components/EmailLogTab.tsx`
- `supabase/functions/get-email-log/index.ts`
- `src/hooks/useAuth.tsx` (verificer)

