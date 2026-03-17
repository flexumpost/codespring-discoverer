
Problemforståelse (bekræftet i logs)
- Nulstilling rammer backend korrekt (`/recover` returnerer 200 flere gange), men der oprettes ingen nye recovery-forsendelser i `email_send_log` efterfølgende forsøg.
- `auth-email-hook` har kun boot/shutdown-logs og ingen faktiske request-logs i samme periode.
- Domænet til mails er verificeret, så problemet ligner et hook-routing/aktiveringsproblem snarere end DNS.

Plan for stabil løsning (så nulstilling virker uanset hook-status)
1) Opret en dedikeret backend-funktion til “glemt adgangskode”
- Ny funktion: `supabase/functions/request-password-reset/index.ts`
- Input: `email`
- Flow:
  - Valider e-mail.
  - Generér recovery-link server-side via admin-auth API (`generateLink` med `type: "recovery"` og redirect til `https://post.flexum.dk/set-password`).
  - Render eksisterende `RecoveryEmail` template.
  - Enqueue mail i eksisterende `auth_emails` kø + skriv `pending` log i `email_send_log` (samme mønster som `auth-email-hook`).
  - Returnér altid generisk succesbesked (ingen bruger-eksponering).

2) Opdater forgot-password i frontend
- Fil: `src/pages/Login.tsx`
- Erstat direkte `supabase.auth.resetPasswordForEmail(...)` med kald til ny backend-funktion via `supabase.functions.invoke("request-password-reset", { body: { email: resetEmail } })`.
- Behold samme brugerbesked (“Tjek din e-mail...”) uanset om konto findes.

3) Konfiguration
- Tilføj funktionen i `supabase/config.toml` med `verify_jwt = false` (fordi flowet bruges før login).
- Behold eksisterende `auth-email-hook` uændret til invite/signup/magiclink.

4) Sikkerhed og robusthed
- Ingen enumeration: samme response ved “ukendt e-mail”.
- Input sanitation (`trim().toLowerCase()`).
- CORS-headere som øvrige funktioner.
- Log kun tekniske fejl server-side, ikke følsomme detaljer til klient.

5) Verificering efter implementering
- Kør “Glemt adgangskode” for en kendt konto.
- Bekræft ny `pending` + `sent` række i `email_send_log` med `template_name = recovery`.
- Klik link i e-mail og bekræft at `/set-password` åbner korrekt og kan opdatere adgangskode.
- Gentag med ukendt e-mail og bekræft samme UI-besked (ingen læk af kontostatus).

Tekniske noter
- Ingen database-migration nødvendig.
- Genbrug af eksisterende template (`supabase/functions/_shared/email-templates/recovery.tsx`) og eksisterende kø-infrastruktur.
- Dette omgår den nuværende ustabile afhængighed af auth hook-triggering for recovery-specifikt, men bevarer resten af auth-mailflowet.
