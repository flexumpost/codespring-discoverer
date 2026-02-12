

## Fase 5: Bulk Upload og OCR-scanning

### Oversigt
I dag kan operatorer kun registrere en forsendelse ad gangen via RegisterMailDialog. I Fase 5 tilfojer vi muligheden for at uploade flere billeder paa en gang, koere OCR paa dem alle automatisk, og derefter gennemgaa og bekraefte resultaterne foer de gemmes.

### Nuvaerende flow (enkelt registrering)
1. Operatoer aabner "Registrer post"-dialogen
2. Tager et foto eller uploader et billede
3. OCR koerer og praeudfylder forsendelsesnr. + modtagernavn
4. Operatoer udfylder resten og gemmer

### Nyt flow (bulk upload)
1. Operatoer klikker "Bulk upload" paa Post-siden
2. En ny side/dialog aabnes, hvor operatoeren kan vaelge flere billeder (drag-and-drop eller fil-vaelger)
3. Systemet koerer OCR paa hvert billede sekventielt (for at undgaa rate limits)
4. Resultaterne vises i en liste/tabel med:
   - Thumbnail af billedet
   - OCR-aflæst forsendelsesnr.
   - OCR-aflæst modtagernavn og automatisk lejer-match
   - Post-type (brev/pakke) -- standard: brev
   - Status-indikator (OK / mangler data / fejl)
5. Operatoeren kan redigere hvert felt inline
6. Operatoeren klikker "Gem alle" for at oprette alle forsendelser paa en gang

### Aendringer

**1. Ny side: `src/pages/BulkUploadPage.tsx`**
- Fil-vaelger der accepterer flere billeder (accept="image/*", multiple)
- Drag-and-drop zone
- Progress-indikator der viser hvor mange billeder der er OCR-behandlet
- Tabel med resultater der kan redigeres inline
- "Gem alle" knap der inserter alle gyldige raekker i mail_items
- Upload af alle billeder til mail-photos bucket

**2. Ny komponent: `src/components/BulkUploadDropzone.tsx`**
- Drag-and-drop omraade med visuel feedback
- Accepterer kun billedfiler
- Viser antal valgte filer

**3. Ny komponent: `src/components/BulkMailReviewTable.tsx`**
- Tabel med en raekke per billede
- Kolonner: Thumbnail, Forsendelsesnr., Modtagernavn, Lejer (dropdown), Type (brev/pakke), Status
- Inline redigering af alle felter
- Mulighed for at fjerne enkelte raekker
- Lejer-dropdown genanvender eksisterende tenant-liste

**4. Opdatering: `src/pages/MailPage.tsx`**
- Tilfoej en "Bulk upload" knap ved siden af "Registrer post"
- Link til /bulk-upload

**5. Opdatering: `src/App.tsx`**
- Tilfoej route for /bulk-upload

### OCR-strategi for bulk
- Billeder behandles sekventielt (et ad gangen) for at undgaa 429 rate limits
- Mellem hvert OCR-kald ventes 500ms
- Hvis et kald fejler med 429, ventes 3 sekunder og proeves igen (maks 2 retries)
- Hvis et kald fejler med 402 (kredit opbrugt), stoppes OCR for resten og brugeren informeres
- Hvert billede faar en status: "venter", "behandler", "ok", "fejl"

### Tekniske detaljer

**BulkUploadPage state:**
```text
- files: File[] (de valgte billeder)
- items: BulkItem[] (resultater med OCR-data, lejer-match, etc.)
- ocrProgress: { current: number, total: number }
- saving: boolean

type BulkItem = {
  file: File
  preview: string
  stampNumber: string
  recipientName: string
  tenantId: string | null
  tenantName: string
  mailType: "brev" | "pakke"
  status: "pending" | "processing" | "ok" | "error"
  errorMsg?: string
}
```

**OCR-loop (sekventiel med rate limit haandtering):**
```text
for each file in files:
  set item.status = "processing"
  convert file to base64
  call supabase.functions.invoke("ocr-stamp", { image_base64 })
  if 429: wait 3s, retry (max 2)
  if 402: stop all, show toast
  set stampNumber, recipientName from response
  run fuzzyMatchTenant for auto lejer-match
  set item.status = "ok" or "error"
  wait 500ms before next
```

**Gem alle (batch insert):**
```text
for each item where status === "ok" and tenantId is set:
  upload photo to mail-photos bucket
  insert into mail_items with operator_id, mail_type, stamp_number, tenant_id, photo_url
invalidate mail-items query cache
navigate back to /mail
```

**Filer der oprettes/aendres:**
- `src/pages/BulkUploadPage.tsx` (ny)
- `src/components/BulkUploadDropzone.tsx` (ny)
- `src/components/BulkMailReviewTable.tsx` (ny)
- `src/pages/MailPage.tsx` (opdateret -- tilfoej bulk-knap)
- `src/App.tsx` (opdateret -- tilfoej route)

Ingen database-aendringer er noedvendige. Den eksisterende ocr-stamp edge function og mail-photos storage bucket genbruges.

