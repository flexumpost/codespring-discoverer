

## Marker som "Læst" ved visning af scan + vis Ulæst/Læst status på operatør-dashboardet

### Problem
1. Når en lejer åbner detalje-dialogen og ser det scannede dokument, markeres brevet ikke automatisk som "Læst" — kun ved download.
2. Operatør-dashboardet viser ikke om et scannet brev er "Ulæst" eller "Læst".

### Ændringer

#### 1. `src/pages/TenantDashboard.tsx` — Marker som læst ved åbning af scan
I `handleRowClick` (linje 572-575): Når brugeren klikker på en række med `scan_url` og status er `ulaest`, kald `markAsRead` automatisk. Beholde download-markeringen som fallback.

#### 2. `src/pages/OperatorDashboard.tsx` — Vis Ulæst/Læst i status
I `getOperatorStatusDisplay` (linje 97-151): Når et brev har `scan_url`, tilføj "Ulæst" eller "Læst" til status-teksten. F.eks.:
- `scan_url` + status `ulaest` → "Scannet — Ulæst"
- `scan_url` + status `laest` → "Scannet — Læst"

Dette tilføjes i de steder hvor funktionen returnerer "Scannet" (linje 118 og 139), samt som generelt check for items med `scan_url`.

### Kodedetaljer

**TenantDashboard.tsx linje 572-575:**
```typescript
const handleRowClick = (item: MailItem) => {
  setSelectedItem(item);
  if (item.scan_url && (item.status === "ulaest" || item.status === "ny")) {
    markAsRead.mutate(item.id);
  }
};
```

**OperatorDashboard.tsx — `getOperatorStatusDisplay`:**
Erstat `return "Scannet"` med:
```typescript
const readLabel = item.status === "laest" ? "Læst" : "Ulæst";
return `Scannet — ${readLabel}`;
```
Gøres på linje 118 og 139 (begge steder der returnerer "Scannet").

