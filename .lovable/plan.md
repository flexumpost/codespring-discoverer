

## Fix: Magiclink virker ikke for nye lejere

### Problem
Nye lejere (f.eks. Nora Transport) modtager en welcome-email med "Sæt din adgangskode →"-link, men linket virker ikke. Operatøren skal manuelt gensende, og først da kan lejeren logge ind.

### Årsag
Supabase's `/auth/v1/verify` endpoint kan redirecte med `?code=` (PKCE flow) i stedet for `#access_token=`. SetPasswordPage håndterer kun hash-baserede tokens — ikke PKCE-koder. Derudover kan der opstå en race condition mellem Supabase-klientens auto-detektion og sidens `useEffect`.

### Ændringer

**1. `supabase/functions/send-new-mail-email/index.ts`**
- Skift `generateLink` type fra `"magiclink"` til `"recovery"` — recovery-links er designet til adgangskode-opsætning og håndteres bedre af Supabase's verify endpoint
- Recovery-typen sikrer at `PASSWORD_RECOVERY`-eventet udløses (som SetPasswordPage allerede lytter efter)

**2. `src/pages/SetPasswordPage.tsx`**
- Tilføj håndtering af PKCE `code`-parameter fra query string (som fallback)
- Brug `supabase.auth.exchangeCodeForSession(code)` hvis `code` findes i URL'en
- Gør den eksisterende `onAuthStateChange`-listener mere robust ved at reagere på flere event-typer

### Tekniske detaljer

Nuværende `generateLink` kald:
```typescript
generateLink({ type: "magiclink", email, options: { redirectTo } })
```

Nyt kald:
```typescript
generateLink({ type: "recovery", email, options: { redirectTo } })
```

SetPasswordPage — ny PKCE-håndtering:
```typescript
// Tjek for PKCE code i query params
const searchParams = new URLSearchParams(window.location.search);
const code = searchParams.get("code");
if (code) {
  supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
    if (error) setLinkExpired(true);
    else setIsReady(true);
    window.history.replaceState(null, "", window.location.pathname);
  });
  return;
}
```

Ingen database-ændringer nødvendige.

