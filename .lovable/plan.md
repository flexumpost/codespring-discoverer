

## Tilføj "Glemt adgangskode" til login-siden

Der er ingen password reset-funktionalitet i appen i dag. Vi skal tilføje to ting:

### 1. Login-siden (`src/pages/Login.tsx`)
- Tilføj et "Glemt adgangskode?"-link under password-feltet
- Ved klik vises en simpel dialog/tilstand hvor brugeren indtaster sin e-mail og modtager et reset-link
- Brug `supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://post.flexum.dk/set-password" })`
- Vis bekræftelsesbesked efter afsendelse
- Ingen "Opret bruger"-knap (der er allerede ingen — bekræftet)

### 2. SetPasswordPage (`src/pages/SetPasswordPage.tsx`)
- Siden håndterer allerede `PASSWORD_RECOVERY` event og URL-hash tokens korrekt
- Ingen ændringer nødvendige — den fungerer allerede for både invite- og recovery-flows

### Ændringer i Login.tsx
- Tilføj state: `forgotMode` (boolean), `resetEmail`
- Når `forgotMode` er true, vis kun e-mail-felt + "Send nulstillingslink"-knap + "Tilbage til login"-link
- Ved submit: kald `resetPasswordForEmail` med redirect til `https://post.flexum.dk/set-password`
- Ved succes: vis toast med "Tjek din e-mail" og skift tilbage til login-tilstand

