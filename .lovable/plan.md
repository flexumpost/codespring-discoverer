## Problem

Når en ny lejer får sin første forsendelse, sender `send-new-mail-email` en velkomstmail med et link, der genereres via `supabase.auth.admin.generateLink({ type: "recovery" })`. Dette link styres af Supabase-projektets globale `mailer_otp_exp`-indstilling, som pt. er sat til 1 time (Supabase-default). Derfor var linket allerede udløbet, da lejeren `mcmullin.edd@gmail.com` klikkede ca. 3 timer efter modtagelse.

Vores andre onboarding-flows (oprettelse af tenant) bruger en custom 24t-token (jf. memory). Den consolidated welcome-email genvejer rundt om det og bruger standard recovery i stedet → derfor 1t expiry.

## Anbefaling

Beslutning: **Brug 24t expiry kun for velkomst-linket** — IKKE for alle recovery-links globalt. Det matcher resten af onboarding-flowet og undgår at svække "Glemt adgangskode" (hvor 1t er sikker default).

## Plan

1. **Skift token-type i `send-new-mail-email`** (linje ~201):
   - Erstat `generateLink({ type: "recovery", ... })` med `generateLink({ type: "magiclink", ... })` med `redirectTo: https://post.flexum.dk/set-password`.
   - Magic links følger samme `mailer_otp_exp`, så det løser ikke alene problemet.

2. **Bedre løsning: Brug det eksisterende custom 24t-onboarding-token-flow**
   - Tjek om der allerede findes en `onboarding_tokens`-tabel / edge function (referer til [Onboarding Flow](mem://auth/onboarding-flow)) — hvis ja, generér token derfra med 24t expiry, indsæt i URL'en til `/set-password`, og `SetPasswordPage` bytter token → session manuelt (som memory beskriver).
   - Hvis ikke findes endnu: opret simpel tabel `onboarding_tokens (token uuid PK, user_id, email, expires_at, used_at)`, en SECURITY DEFINER RPC `consume_onboarding_token(token)` der returnerer ny session via `auth.admin.generateLink` server-side, og brug den i `send-new-mail-email`.

3. **Validér**:
   - Lav test: send velkomst → vent >1 time → klik link → forventet: virker stadig i 24t.
   - Eksisterende "Glemt adgangskode" (`request-password-reset`) bevarer 1t expiry.

## Filer der ændres

- `supabase/functions/send-new-mail-email/index.ts` — skift link-generering
- Evt. ny migration: `onboarding_tokens`-tabel + RPC (hvis ikke eksisterende flow kan genbruges)
- Evt. ny edge function: `consume-onboarding-token`
- `src/pages/SetPasswordPage.tsx` — håndter custom token i URL hvis ny flow

## Quick-fix alternativ (hvis du foretrækker)

Sæt `mailer_otp_exp = 86400` globalt i Supabase Auth dashboard manuelt. Hurtigt, men:
- Påvirker alle recovery/magic-links (også glemt-adgangskode).
- Udløser security-advarsel i Supabase linter.
- Ingen kode-ændringer.

Sig til, hvis du vil have quick-fix i stedet for den robuste løsning.
