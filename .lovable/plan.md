## Diagnose

Ny lejer får e-mailen "Ny forsendelse modtaget" med knappen **"Se din post →"** der peger på `https://post.flexum.dk/login`, men lejeren har aldrig sat en adgangskode → kan ikke logge ind.

Årsagen ligger i `send-new-mail-email`, som kun sender velkomst-varianten (`welcome_shipment` med et 24-timers onboarding-link til `/set-password`) hvis kalderen sætter `is_new_tenant: true`. Den flag sættes kun ét sted:

- ✅ `RegisterMailDialog` — men kun når lejeren blev oprettet **inline i samme dialog-session** (`pendingNewTenant`).
- ❌ `BulkUploadPage` — hardkodet `is_new_tenant: false`.
- ❌ `OperatorDashboard`, `ShippingPrepPage`, `ScanUploadDialog`, `TenantsPage` (send-actions) — sender aldrig `is_new_tenant: true`.
- ❌ `RegisterMailDialog` når lejeren var oprettet i en **tidligere session** (fx via `TenantsPage`, hvor Supabase-invite-linket kan være udløbet efter 24 t) → næste postregistrering sender bare "Se din post" til en bruger uden password.
- ❌ Selv i den korrekte inline-flow: hvis lejeren venter >24 t med at klikke, er `onboarding_token` udløbet, og der kommer aldrig et nyt link — alle efterfølgende mails peger på `/login`.

Resultatet: enhver lejer, hvis bruger endnu ikke har sat egen adgangskode (aldrig logget ind), får e-mails der leder til login-siden, hvor de ikke kan komme videre.

## Fix

Flyt beslutningen "skal denne mail have et onboarding-link?" fra klienten til `send-new-mail-email`, så alle afsendelses-stier automatisk gør det rigtige.

### 1) `supabase/functions/send-new-mail-email/index.ts`

- Efter opslag af `tenant`: hvis `tenant.user_id` findes, hent brugeren via `supabaseAdmin.auth.admin.getUserById(tenant.user_id)` og udled `needsOnboarding = !user.last_sign_in_at` (brugeren har aldrig logget ind → intet reelt password).
- Beregn `effectiveIsNew = is_new_tenant || needsOnboarding`.
- Brug `effectiveIsNew` alle de steder hvor `is_new_tenant` bruges i dag: valg af template-slug (`welcome_shipment`), render af `WelcomeShipmentEmail` med et nyt 24-timers `onboarding_token`, samt log-metadata.
- Sikrer, at hver ny forsendelses-mail til en endnu-ikke-aktiveret bruger indeholder et **frisk** onboarding-link (og dermed ikke er afhængig af det 24 t-vindue der blev genereret ved allerførste mail).
- Bevar nuværende adfærd for lejere der har logget ind mindst én gang: normal `NewShipmentEmail` med "Se din post →".

### 2) Klientsiderne (ingen ændring i logik, kun oprydning)

- Behold `is_new_tenant: true` i `RegisterMailDialog` (uskadelig, forbliver som eksplicit hint).
- `BulkUploadPage`, `OperatorDashboard`, `ShippingPrepPage`, `ScanUploadDialog`, `TenantsPage`: ingen ændringer nødvendige — server-siden opdager selv onboarding-behov via `last_sign_in_at`.

### 3) Verifikation

- Manuel test: opret ny lejer via `TenantsPage` (invite udløber), vent, registrer post via `RegisterMailDialog` for eksisterende lejer → tjek at e-mailen nu er "Velkommen…" med `/set-password?onboarding_token=…`.
- Genafspil scenariet fra screenshottet (jkp-89@hotmail.com): resend `send-new-mail-email` for lejeren → skal nu levere onboarding-linket.
- Tjek `email_send_log.metadata.is_new_tenant` viser `true` efter fix i disse tilfælde.

### Ikke i scope

- Selve `SetPasswordPage`- og `consume-onboarding-token`-flowet virker som forventet og ændres ikke.
- Vi udvider ikke onboarding-token-gyldigheden (bliver 24 t), da hver ny mail nu genererer et nyt link.
- Ingen ændring af auth-invite-mails eller `create-tenant-user`.
