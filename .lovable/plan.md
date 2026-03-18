

## Problem

Når en scanning uploades til en forsendelse, oprettes en in-app notifikation via `notify_tenant_on_scan`-triggeren, men der sendes **ingen e-mail** til lejeren. Samme mønster som det tidligere problem med ny post.

Build-fejlen (`Failed to load native binding` i `@swc/core`) er en forbigående infrastruktur-fejl og ikke relateret til kodeændringer.

## Løsning

### 1. Opdater `ScanUploadDialog.tsx`

Efter succesfuld upload (linje ~48, efter `toast.success`), kald en edge function til at sende scan-notifikations-e-mail:

```typescript
supabase.functions.invoke("send-new-mail-email", {
  body: {
    tenant_id: tenantId,
    mail_type: "scan",
    stamp_number: null, // stamp_number er ikke tilgængelig i dialogen
    template_slug: "new_scan",
  },
}).catch((err) => console.error("send scan email failed:", err));
```

### 2. Alternativ: Udvid eksisterende edge function

Udvid `send-new-mail-email` til at acceptere en valgfri `template_slug` parameter, så den kan bruges til både `new_shipment` og `new_scan` skabeloner. Hvis `template_slug` ikke er angivet, falder den tilbage til `new_shipment`.

### 3. Tilpas scan-upload i OperatorDashboard

Operatør-dashboardet har også inline drag-and-drop upload. Scan-uploaden sker via `uploadScanFile()` funktionen. E-mail-kaldet skal tilføjes i `ScanUploadDialog` (dialog-upload) og i `OperatorDashboard.tsx` (inline drag-drop upload) — begge steder efter succesfuld upload.

**Problem**: `uploadScanFile` og inline-droppet har ikke adgang til `stamp_number`. Vi skal hente det fra mail_item-data, som allerede er tilgængeligt i OperatorDashboard via `item.stamp_number`.

### 4. Forudsætning: E-mail-skabelon

Der skal eksistere en `new_scan` skabelon i `email_templates`-tabellen. Hvis den ikke findes, kan vi genbruge `new_shipment`-skabelonen med `template_slug` som fallback — eller oprette en ny skabelon via en database migration.

### Ændrede filer

1. **`supabase/functions/send-new-mail-email/index.ts`** — Tilføj support for valgfri `template_slug` parameter (default: `new_shipment`)
2. **`src/components/ScanUploadDialog.tsx`** — Tilføj fire-and-forget kald til edge function efter upload
3. **`src/pages/OperatorDashboard.tsx`** — Tilføj samme kald efter inline drag-drop scan upload, med `stamp_number` fra item-data

