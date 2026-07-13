
# Robust /set-password mod link-scannere

## Problem
Gmail/Outlook/antivirus henter ofte URL'er i baggrunden inden brugeren klikker. Vores `/set-password` kalder straks `exchangeCodeForSession(code)` / `setSession(...)` ved page load — det forbruger Supabase's engangs-recovery-token. Når brugeren så klikker, er koden væk → "linket er udløbet".

Det er stort set det der skete for `alfapravo11@gmail.com`: hun endte alligevel med at komme ind (kom lige efter scanneren), men oplevelsen føles som et udløbet link.

## Løsning: opdel flowet i to trin

### 1. `src/pages/SetPasswordPage.tsx`
- Ved mount: læs `code`, hash-tokens eller `onboarding_token` fra URL'en, men **veksl dem IKKE med det samme**. Gem parametrene i state og fjern dem fra URL'en (så scanner/refresh ikke kan trigge dem igen ved et uheld).
- Vis en simpel "bekræft"-skærm med teksten "Klik for at fortsætte og vælg ny adgangskode" og en knap `Fortsæt`. Dette forhindrer preview-bots i at forbruge tokenet.
- Først når brugeren klikker `Fortsæt`, kaldes:
  - `exchangeCodeForSession(code)` (PKCE-flow), eller
  - `setSession({ access_token, refresh_token })` (implicit hash-flow), eller
  - `consume-onboarding-token` + `verifyOtp` (24t onboarding-flow).
- Efter succes: vis password-formular som i dag.
- Hvis brugeren allerede har en aktiv session (fx allerede recovered i denne tab), spring bekræftelses-trinnet over og vis formularen direkte.
- Ved fejl (token allerede forbrugt / udløbet): vis tydeligere besked med to knapper:
  - "Anmod om nyt link" → navigerer til `/login` i forgot-mode med email prefill hvis muligt.
  - "Tilbage til login" → `/login`.
- Behold auto-detection af eksisterende session (`onAuthStateChange` / `PASSWORD_RECOVERY`) for gammeldags flows uden token i URL.

### 2. `src/i18n/locales/da.json` og `en.json`
Nye nøgler under `setPassword`:
- `confirmTitle` — "Bekræft dit link"
- `confirmDescription` — "Klik nedenfor for at fortsætte og oprette din adgangskode."
- `confirmButton` — "Fortsæt"
- `linkExpiredCanRequestNew` — "Linket er brugt eller udløbet. Anmod om et nyt reset-link."
- `requestNewLink` — "Anmod om nyt link"
- `backToLogin` — "Tilbage til login"

### 3. Ingen ændringer i backend/edge functions
Recovery-mailen, `request-password-reset`, `consume-onboarding-token` og skabelonen `recovery.tsx` er uændrede. Ændringen er ren frontend.

## Verifikation
- Åbn en recovery-mail i Gmail → observér at `/set-password` viser bekræft-skærm og at scanneren ikke længere kan forbruge tokenet.
- Klik `Fortsæt` → session etableres, formular vises, ny adgangskode gemmes.
- Genindlæs siden efter forbrug → vis "linket er brugt eller udløbet" med knap til at anmode om nyt link.
- Test også onboarding-token-flow (`?onboarding_token=…`) og hash-flow (`#access_token=…`).

## Tekniske detaljer
- Fjern URL-parametre med `window.history.replaceState` **så snart** vi har læst dem, uanset hvilken bekræft-knap brugeren klikker. Det undgår genforbrug ved refresh.
- Bevar `linkExpired`-state for eksplicitte `error`/`error_code` i hash (den vej ved vi allerede at linket er dødt uden at prøve).
- Ingen state gemmes i `localStorage` — kun i React state, så den er væk efter fuld reload (bevidst; forhindrer at scanner-flow via forudindlæste tabs kan udnytte det).
