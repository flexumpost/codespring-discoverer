

## Problem

Når en lejer opretter en ny postmodtager (via Indstillinger-siden), kalder den `create-tenant-user` med email + password — uden `mode: "invite"`. Det betyder at brugeren oprettes direkte med `admin.createUser({ email_confirm: true })`, og der sendes **ingen email overhovedet**. Den nye postmodtager ved ikke, at de har fået en konto, medmindre lejeren selv fortæller dem login-oplysningerne.

## Løsning

Skift postmodtager-oprettelse til at bruge invite-flowet (`mode: "invite"`), så den nye bruger modtager en invitations-email med et link til at sætte sin adgangskode — præcis som når en operatør inviterer en lejer.

### Ændringer

**`src/pages/SettingsPage.tsx`**
- Fjern password-feltet fra dialogen (det er ikke nødvendigt med invite-flow)
- Send `mode: "invite"` i body til `create-tenant-user`
- Opdater valideringen (password er ikke længere påkrævet)
- Opdater dialog-teksten så det er tydeligt, at en invitation sendes per email

**Ingen ændringer til edge-funktionen** — `create-tenant-user` understøtter allerede `mode: "invite"`.

