

## Fix: Scannet brev skal vise "Scannet" i stedet for "Afventer handling"

### Problem
Når et brev er scannet (har `scan_url`), viser status-kolonnen stadig den rå status fra databasen (f.eks. "Afventer handling") i stedet for "Scannet". Dropdown og "Fysisk brev gemmes i X dage" skal fortsat vises.

### Ændring

**`src/pages/TenantDashboard.tsx`** — linje 262:

Erstat:
```typescript
const statusLabel = STATUS_LABELS[item.status as MailStatus] ?? item.status;
```

Med:
```typescript
const statusLabel = item.status === "ulaest" ? "Ulæst" : item.status === "laest" ? "Læst" : "Scannet";
```

Dette sikrer at scannet post viser "Scannet" som standard, men stadig viser "Ulæst"/"Læst" hvis lejeren har interageret med filen. Dropdown og nedtælling forbliver uændret.

