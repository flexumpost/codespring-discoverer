## Problemerne

På billedet er e-mailen den indbyggede "InviteEmail" der sendes af `auth-email-hook`, når "Gensend invitation" kalder `create-tenant-user` i `mode: invite`. To bugs:

1. **Afsender vises som "codespring-discoverer"** — `auth-email-hook` har stadig scaffold-default `SITE_NAME = "codespring-discoverer"` (linje 39) og indsætter det også i `from`-headeren (linje 261). Modtagerens mail-klient bruger From-navnet som afsender.
2. **Ingen synlig knap** — `InviteEmail` (og de andre auth-templates) bruger en sort knap (`#000000` baggrund). I iOS Mail dark mode auto-inverteres farverne og knappen forsvinder mod den mørke baggrund. Skabelonen er også på engelsk og helt ubranded sammenlignet med `WelcomeEmail`.

## Løsning

### 1. Ret `supabase/functions/auth-email-hook/index.ts`
- `SITE_NAME = "Flexum Coworking"`
- `from` ender op som `Flexum Coworking <noreply@mail.post.flexum.dk>` (uændret domæne, kun navnet ændres).
- Danske emnefelter:
  - `signup`: "Bekræft din e-mail"
  - `invite`: "Du er blevet inviteret til Flexum Coworking"
  - `magiclink`: "Dit login-link"
  - `recovery`: "Nulstil din adgangskode"
  - `email_change`: "Bekræft din nye e-mail"
  - `reauthentication`: "Din bekræftelseskode"

### 2. Brand de 6 auth-templates i `supabase/functions/_shared/email-templates/`
Genskriv `invite.tsx`, `recovery.tsx`, `signup.tsx`, `magic-link.tsx`, `email-change.tsx`, `reauthentication.tsx` så de matcher `welcome.tsx`:
- Dansk tekst hele vejen igennem.
- Flexum-logo øverst (samme storage-URL som welcome).
- Knap-styling: `backgroundColor: '#00aaeb'`, `color: '#ffffff'`, `padding: '12px 24px'`, `borderRadius: '6px'`, `display: 'inline-block'`, `fontWeight: 600`. Dette undgår iOS dark-mode-inverteringen, så knappen forbliver synlig.
- Tilføj `<Head>` med `<meta name="color-scheme" content="light only" />` og `<meta name="supported-color-schemes" content="light" />` så Apple Mail ikke auto-inverterer farverne.
- Tilføj fallback-tekstlink under hver knap ("Virker knappen ikke? Brug dette link: …") så brugeren altid har en klikbar vej videre, selv hvis knappen ikke renderer.
- `invite.tsx` får overskriften "Du er blevet inviteret" og brødtekst der forklarer at modtageren skal klikke for at sætte sin adgangskode og logge ind på sin postkasse hos Flexum Coworking.

### 3. Deploy
Deploy `auth-email-hook` så ændringerne træder i kraft. Næste gang operatøren trykker "Gensend invitation" sendes den nye, brandede danske invitation med synlig knap fra "Flexum Coworking".

## Bemærk
- Ingen ændringer i app-koden eller databasen — kun edge function + templates.
- Recovery-rækken i log'en (billede 2) er fra den separate `request-password-reset` flow (welcome-mailen). Den er allerede branded korrekt og rammes ikke.
- DNS/sender-domæne forbliver `mail.post.flexum.dk` — ingen ny domæneopsætning kræves.
