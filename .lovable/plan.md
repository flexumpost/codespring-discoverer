

## Tilføj "Rekommanderet" funktionalitet

### Oversigt
Tilføj et `is_registered` boolean-felt til `mail_items`, en checkbox i registreringsdialogen (auto-afkrydset via OCR), og visning af mærket på begge dashboards.

### Ændringer

**1. Database-migration**
- Tilføj kolonne `is_registered boolean NOT NULL DEFAULT false` til `mail_items`.

**2. OCR Edge Function (`supabase/functions/ocr-stamp/index.ts`)**
- Tilføj `is_registered` (boolean) til tool-call parametrene i prompten.
- Instruer modellen: sæt `true` hvis teksten "Rekommanderet" eller "Registered" ses på forsendelsen.
- Returner `is_registered` i response JSON.

**3. `src/components/RegisterMailDialog.tsx`**
- Tilføj state `isRegistered` (boolean, default `false`).
- I `runOcr`: sæt `isRegistered` til `true` hvis OCR returnerer `is_registered: true`.
- Tilføj en Checkbox med label "Rekommanderet" i formfelterne (efter afsender-feltet).
- Inkludér `is_registered: isRegistered` i `mail_items.insert()`.
- Reset `isRegistered` i `resetForm()`.

**4. `src/pages/TenantDashboard.tsx`**
- I afsender-kolonnen (linje ~936): vis et `<Badge>` med teksten "Rekommanderet" ved siden af afsendernavnet, hvis `item.is_registered === true`.

**5. `src/pages/OperatorDashboard.tsx`**
- På forsendelseslinjen (nær type-badge ~669): vis et lille bold **R** i en firkant (`<span className="inline-flex items-center justify-center w-5 h-5 border border-current font-bold text-xs">R</span>`) hvis `item.is_registered === true`.

**6. `src/components/BulkUploadDropzone.tsx`** (hvis bulk-upload også bruger mail_items insert)
- Sikre at `is_registered` default til `false` — ingen ændring nødvendig da DB default håndterer det.

### Tekniske detaljer
- Kolonne: `is_registered boolean NOT NULL DEFAULT false` — ingen eksisterende data påvirkes.
- OCR-prompten udvides med et ekstra tool-parameter `is_registered` (boolean).
- TypeScript-typen opdateres automatisk efter migration.

