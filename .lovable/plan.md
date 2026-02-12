# Fase 2: Post-registrering for operatorer

## Hvad bygger vi?

En "/mail"-side hvor operatorer kan registrere indkommende post (breve og pakker) og se en oversigt over al post.

## Funktionalitet

### 1. Oversigt over al post (tabel)

- Viser alle registrerede forsendelser med kolonner: Type, Afsender, Lejer, Forsendelsesnr., Status, Modtaget
- Filtreringsmuligheder (status, type)
- Knap til at registrere ny post

### 2. Registrer ny post (dialog/formular)

- **Posttype**: Brev eller Pakke (radio-valg - standard er brev)
- **Foto-upload**: Tag billede eller upload foto af forsendelsen (Lovable Cloud Storage)
- **Forsendelsesnr.**: Valgfrit numerisk felt
- **Afsender**: Fritekstfelt
- **Lejer**: Søgefelt som søger alle aktive lejere (fra `tenants`-tabellen) 
- **Noter**: Valgfrit tekstfelt
- Gemmer i `mail_items` med status "ny"

### 3. Routing

- Tilfoej `/mail`-rute i App.tsx (beskyttet, kun operator)

---

## Tekniske detaljer

### Storage bucket

- Opret en `mail-photos` storage bucket til foto-uploads
- RLS-politik: Operatorer kan uploade og laese, lejere kan laese egne

### Database

- Ingen skemaandringer -- `mail_items`-tabellen er klar med alle nodvendige kolonner (`photo_url`, `stamp_number`, `sender_name`, `tenant_id`, `mail_type`, `notes`)

### Nye filer

- `src/pages/MailPage.tsx` -- Hovedside med tabel-oversigt og "Registrer post"-knap
- `src/components/RegisterMailDialog.tsx` -- Dialog med formular til registrering af ny post

### Redigerede filer

- `src/App.tsx` -- Tilfoej `/mail`-rute med ProtectedRoute
- `src/components/AppSidebar.tsx` -- Ingen andring nodvendig (linket til `/mail` findes allerede)

### Formular-flow

1. Operator klikker "Registrer post"
2. Dialog aabner med formular
3. Operator udfylder felter og uploader evt. foto
4. Ved submit: Upload foto til storage bucket, indsaet raekke i `mail_items`
5. Tabellen opdateres automatisk