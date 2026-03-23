
Målet er at fjerne den vedvarende `401 Unauthorized` på **Gensend invitation**.

### Hvorfor fejlen stadig sker
- Requesten sender faktisk `Authorization: Bearer ...` korrekt.
- Tokenet indeholder et `session_id`, som auth-serveren ikke længere kender (`session_not_found` i logs).
- `send-new-mail-email` validerer i dag med `auth.getUser()`, som kræver en aktiv server-session — derfor 401, selv om JWT-signaturen er gyldig.

### Plan (konkret implementering)

1) **Skift auth-validering i `send-new-mail-email` fra `getUser()` til `getClaims()`**
- Fil: `supabase/functions/send-new-mail-email/index.ts`
- Erstat:
  - `const { data: claims, error: claimsErr } = await supabaseUser.auth.getUser();`
- Med:
  - udtræk token fra `Authorization` header
  - `auth.getClaims(token)` for at læse `sub`
  - brug `sub` som `callerId` til rollecheck i `user_roles`
- Behold eksisterende operator-check (`role = operator`) og resten af flowet uændret.

2) **Gør samme auth-mønster i `log-login`**
- Fil: `supabase/functions/log-login/index.ts`
- Samme skifte til `getClaims()` for at undgå de 401-fejl, der også ses dér.
- Det fjerner støj/runtime-fejl fra login-tracking.

3) **Frontend robusthed på “Gensend invitation”**
- Fil: `src/pages/TenantDetailPage.tsx` (`ResendInviteButton`)
- Fjern manuel token-injektion (`getSession` + custom `Authorization` header) og kald `supabase.functions.invoke(...)` direkte.
- Tilføj venlig fejltekst ved 401: “Din session er udløbet – log ind igen”.

4) **Deploy og verifikation**
- Deploy: `send-new-mail-email` og `log-login`.
- Test:
  - Klik **Gensend invitation** på lejerdetalje-side.
  - Bekræft 200-respons i network.
  - Bekræft ny `welcome_shipment`/relevant loglinje i email-log.
  - Bekræft at 401-runtimefejl for disse to funktioner stopper.

### Tekniske noter
- Ingen database-migrationer er nødvendige.
- Ingen ændringer i RLS/policies er nødvendige for denne fix.
- Fixen er målrettet auth-valideringsmønsteret i Edge Functions, som er årsagen til den konkrete 401-loop.
