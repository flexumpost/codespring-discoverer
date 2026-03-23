

## Fix: "Gensend invitation" returnerer 401

### Problem
`send-new-mail-email` er ikke opført i `supabase/config.toml`, så den bruger standard `verify_jwt = true`. Det betyder at Supabase's gateway verificerer JWT'en **før** funktionens kode kører. Hvis tokenet er udløbet eller stale, returneres 401 uden at funktionen overhovedet eksekveres.

Funktionen validerer allerede auth manuelt i koden (linje 42-66), så gateway-verifikation er overflødig og skaber problemer.

### Ændring

**`supabase/config.toml`** — Tilføj:
```toml
[functions.send-new-mail-email]
  verify_jwt = false
```

Dette matcher mønsteret brugt af alle andre Edge Functions i projektet. Funktionen fortsætter med at validere operatør-rollen i koden.

Deploy `send-new-mail-email` efter ændringen.

