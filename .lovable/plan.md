

## Fix: "Scanning bestilt" vises for allerede scannede breve

### Problem
Breve med `chosen_action = "standard_scan"` viser altid "Scanning bestilt", selv når de allerede er scannet (har `scan_url` sat). Logikken tjekker aldrig `scan_url` for denne handlingstype.

Til sammenligning håndterer `chosen_action === "scan"` (linje 184-190) det korrekt — den tjekker `scan_url` først og viser "Scannet — Ulæst/Læst" hvis filen findes.

### Løsning

**Fil**: `src/pages/OperatorDashboard.tsx`, linje 158-162

Tilføj et `scan_url`-tjek til `standard_scan`-casen, præcis som det allerede gøres for `scan`:

```typescript
if (action === "standard_scan") {
  if (item.scan_url) {
    const readLabel = item.status === "laest" ? t("statusDisplay.read") : t("statusDisplay.unread");
    return t("statusDisplay.scannedRead", { status: readLabel });
  }
  const tenantType = item.tenants?.tenant_types?.name;
  const scanDate = getShippingDate(tenantType ?? "Lite", "brev");
  return `${t("statusDisplay.scanOrdered")} ${formatI18nDate(scanDate, t)}`;
}
```

Én ændring, én fil. Herefter vil breve 2858, 2853 og 2845 korrekt vise "Scannet — Ulæst".

