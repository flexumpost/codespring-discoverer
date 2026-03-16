

## Opdater login-siden

### Ændringer i `src/pages/Login.tsx`

1. **Fjern signup-funktionalitet**: Fjern `isSignUp`/`fullName` state, signup-logik i `handleSubmit`, signup-formularen og toggle-knapperne i bunden
2. **Erstat ikon med logo**: Kopiér det uploadede logo til `src/assets/` og brug det i stedet for Mail-ikonet
3. **Opdater titel**: Ændr "Flexum Posthåndtering" → "Flexum Coworking post"
4. **Opdater beskrivelse**: Fast tekst "Log ind med din konto" (ingen conditional)

### Resultat
En ren login-side med kun e-mail/adgangskode, Flexum Coworking-logoet og ingen mulighed for selvregistrering.

