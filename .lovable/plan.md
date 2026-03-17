

## Ændringer i invite-emailen

**Fil:** `supabase/functions/_shared/email-templates/invite.tsx`

### 1. Større mellemrum mellem logo og overskrift
- Øg `marginBottom` på logo fra `24px` til `40px` for at skabe luft i Outlook

### 2. Opdater overskrift
- Preview: "Velkommen til Flexum Coworking post – sæt din adgangskode"
- Heading: "Velkommen til Flexum Coworking post"

### 3. Opdater brødtekst
- Erstat den nuværende tekst med:
  - "Din virksomhed har hermed fået en konto hos Flexum Coworking post."
  - "Her kommer du til at modtage billeder af dine forsendelser og kan bestemme hvad der skal ske med dem."
- Fjern `<Link>`-wrapperen da "Flexum" ikke længere er et selvstændigt link

### 4. Runde hjørner i Outlook
- Outlook ignorerer `border-radius` på `<a>`-tags. Løsningen er at bruge VML (Vector Markup Language) som fallback — en "bulletproof button"-teknik
- Wrap `<Button>` i en Outlook-specifik VML `<v:roundrect>` via `dangerouslySetInnerHTML` i en `<Section>`, som giver runde hjørner i Outlook
- Alternativt: React Email's `<Button>` komponent understøtter ikke VML direkte, så vi bruger rå HTML med `<!--[if mso]>` conditional comments for Outlook-kompatibilitet

### Deployment
- Redeploy `auth-email-hook` efter ændringen

