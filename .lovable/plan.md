

## Problem

Når brugeren klikker invite-linket, lander de på `/set-password`, men siden viser "Indlæser..." permanent. Årsagen er dobbelt:

1. **Race condition**: `SetPasswordPage` registrerer sin `onAuthStateChange`-listener EFTER at `AuthProvider` allerede har behandlet `SIGNED_IN`-eventet fra URL-tokenet. Eventet er altså "brugt" inden siden når at lytte.

2. **Forkert redirect-domæne**: `create-tenant-user` bruger `req.headers.get("origin")` som redirect, hvilket giver preview-domænet i stedet for `flexum.dk`.

## Ændringer

| Fil | Ændring |
|---|---|
| `src/pages/SetPasswordPage.tsx` | Tjek eksisterende session ved mount (via `getSession()`), så siden ikke kun afhænger af at "fange" eventet i realtid |
| `supabase/functions/create-tenant-user/index.ts` | Hardcode `https://flexum.dk` som redirect-origin i stedet for `req.headers.get("origin")` |

### SetPasswordPage fix

```typescript
useEffect(() => {
  // Check if already signed in (event may have fired before mount)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) setIsReady(true);
  });

  // Also listen for future events
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
      setIsReady(true);
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

### create-tenant-user fix

```typescript
const origin = "https://flexum.dk";
```

Herefter redeploy af `create-tenant-user`.

