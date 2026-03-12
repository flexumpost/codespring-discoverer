

## Problem

1. **Plus-lejere kan ikke ændre handling**: `getExtraActions("Plus", "brev")` returnerer `[]`, så dropdown'en skjules helt. Lejeren bør kunne vælge en alternativ handling (scan, afhentning) selv hvis standarden er "send".
2. **Afhentningsdato er låst til torsdag**: Når standarden er "afhentning", vises næste torsdag som dato. Lejeren bør selv kunne vælge afhentningsdag (via den eksisterende pickup-dialog).
3. **"Send" skal ikke vises som ekstra handling** når det allerede er standardhandlingen — det giver ikke mening at tilbyde det som ekstra.

## Ændringer i `src/pages/TenantDashboard.tsx`

### 1. Opdater `getExtraActions` (linje 43-53)

Funktionen skal modtage `defaultAction` som parameter og filtrere standardhandlingen fra. Plus-lejere får nu også adgang til ekstra handlinger for breve.

```typescript
function getExtraActions(tenantTypeName: string | undefined, mailType: string, defaultAction?: string | null): string[] {
  if (mailType === "pakke") {
    return ["send", "afhentning"].filter(a => a !== defaultAction);
  }
  switch (tenantTypeName) {
    case "Lite":    return ["scan", "afhentning", "send"].filter(a => a !== defaultAction);
    case "Standard": return ["scan", "afhentning", "send"].filter(a => a !== defaultAction);
    case "Plus":     return ["scan", "afhentning", "send"].filter(a => a !== defaultAction);
    default:         return [];
  }
}
```

Effekt: Hvis Plus har `default_mail_action: "send"`, filtreres "send" fra, og dropdown viser scan + afhentning. Hvis Lite har `default_mail_action: "afhentning"`, filtreres "afhentning" fra, og dropdown viser scan + send.

### 2. Opdater kaldet til `getExtraActions` (linje ~573)

Tilføj `defaultAction` som argument:

```typescript
const extraActions = getExtraActions(tenantTypeName, item.mail_type, defaultAction);
```

### 3. Afhentning med standard-handling: åbn pickup-dialog (linje ~184-187)

Når standardhandlingen er "afhentning" og lejeren endnu ikke har valgt en dato, skal status-teksten opfordre til at vælge dato. Lejeren kan klikke for at åbne pickup-dialogen via "Vælg handling" → "Afhentning" (som nu vil være tilgængelig).

Alternativt: I `getStatusDisplay`, for `effectiveAction === "afhentning"`, vis "Kan afhentes — vælg dato" i stedet for en dato bundet til torsdag. Lejeren vælger selv dato via den eksisterende afhentningsdialog.

Ændring i `getStatusDisplay` (linje 184-187):
```typescript
if (effectiveAction === "afhentning") {
  return ["Kan afhentes", "Vælg afhentningsdato via 'Ekstra handling'"];
}
```

### 4. Prisjustering for handlinger der matcher standarden

Ingen ekstra gebyr vises, da filtrering af standardhandlingen fra listen allerede sikrer at kun *ekstra* handlinger (med gebyr) vises.

### Ingen databaseændringer

