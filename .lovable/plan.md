

## Fase 6: Scanning-funktionalitet

### Overblik

Lejere kan allerede vaelge "Scan" som handling paa deres post. Denne fase tilfojer den fulde scanning-workflow: operatoerer kan uploade scannede dokumenter, og lejere kan downloade dem.

### Database-aendringer

**1. Ny kolonne paa `mail_items`:**
- `scan_url` (text, nullable) - URL til det scannede dokument i storage

**2. Ny storage-bucket:**
- `mail-scans` (privat bucket) - til opbevaring af scannede PDF/billeder

**3. RLS-politikker for `mail-scans` bucket:**
- Operatoerer kan uploade og laese alle filer
- Lejere kan kun laese filer tilknyttet deres egne forsendelser

### Operator-side aendringer

**`src/pages/OperatorDashboard.tsx`:**
- Tilfoej en "Upload scan" knap paa raekkerne hvor `chosen_action = 'scan'` og `scan_url` er null
- Knappen aabner en fil-vaelger (PDF/billede)
- Filen uploades til `mail-scans` bucket og `scan_url` opdateres paa mail_item
- Naar scan er uploadet, vises et ikon/badge der indikerer "Scannet"
- En notifikation sendes automatisk til lejeren

**Ny komponent: `src/components/ScanUploadButton.tsx`:**
- Fil-input (accepterer PDF, PNG, JPG)
- Upload til storage med unik sti: `{tenant_id}/{mail_item_id}.{ext}`
- Opdaterer `mail_items.scan_url` med den offentlige URL
- Opretter notifikation til lejeren

### Lejer-side aendringer

**`src/pages/TenantDashboard.tsx`:**
- I detalje-dialogen: hvis `scan_url` er sat, vis en "Download scan" knap
- I tabellen: vis et ikon (f.eks. ScanLine) naar scannet dokument er tilgaengeligt

### Notifikationer

**Ny database-trigger: `notify_tenant_on_scan`:**
- Trigger paa UPDATE af `mail_items` naar `scan_url` aendres fra NULL til en vaerdi
- Opretter en notifikation: "Din forsendelse er blevet scannet og er klar til download"

### Teknisk plan

```text
1. SQL-migration:
   - ALTER TABLE mail_items ADD COLUMN scan_url text;
   - Opret mail-scans bucket
   - RLS: operatoerer INSERT/SELECT, lejere SELECT (kun egne)

2. ScanUploadButton.tsx (ny fil):
   - Props: mailItemId, tenantId, onUploaded callback
   - Haandterer fil-upload til storage
   - Opdaterer mail_items.scan_url
   - Sender notifikation

3. OperatorDashboard.tsx:
   - Import ScanUploadButton
   - Vis knappen paa rækker med chosen_action='scan' og scan_url=null
   - Vis "Scannet" badge naar scan_url er sat

4. TenantDashboard.tsx:
   - Tilfoej ScanLine ikon i tabel naar scan_url er sat
   - Tilfoej "Download scan" knap i detalje-dialog
```

### Resultat
- Operatoerer kan uploade scannede dokumenter direkte fra dashboardet
- Lejere faar notifikation og kan downloade scanningen
- Filer gemmes sikkert med korrekt adgangskontrol

