

## Problem

Når et login-/invitationslink er udløbet, viser `SetPasswordPage` blot en generisk fejlbesked ("Linket er ugyldigt eller udløbet. Prøv igen.") som en toast-notifikation. Brugeren sidder fast på en loading-tilstand uden klar vejledning om, hvad de skal gøre.

## Løsning

Vis en tydelig fejlside med en forklaring og vejledning, når `setSession` fejler (udløbet token), i stedet for blot en toast.

### Ændringer

**1. `src/pages/SetPasswordPage.tsx`**
- Tilføj en `linkExpired` state (boolean).
- Når `setSession` fejler (linje 33-34), sæt `linkExpired = true` i stedet for kun at vise en toast.
- Når `linkExpired` er true, vis en dedikeret besked i card-indholdet:
  - Overskrift: "Linket er udløbet"
  - Tekst: "Dit login-link er udløbet. Kontakt venligst Flexum Coworking for at få tilsendt et nyt link."
  - Ingen formular vises – kun beskeden.

**2. `src/i18n/locales/da.json`** — Tilføj nye oversættelser:
- `setPassword.linkExpired`: "Linket er udløbet"
- `setPassword.linkExpiredMessage`: "Dit login-link er udløbet. Kontakt venligst Flexum Coworking for at få tilsendt et nyt link."

**3. `src/i18n/locales/en.json`** — Tilføj tilsvarende engelske oversættelser:
- `setPassword.linkExpired`: "Link expired"
- `setPassword.linkExpiredMessage`: "Your login link has expired. Please contact Flexum Coworking to request a new link."

