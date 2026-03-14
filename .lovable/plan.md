

## Vis "Upload scan" for både "Scan nu" og "Standard scanning"

### Ændring

**`src/pages/OperatorDashboard.tsx` — linje 471**

Ændr betingelsen fra:
```typescript
item.chosen_action === "scan" && !(item as any).scan_url && item.tenant_id
```
Til:
```typescript
(item.chosen_action === "scan" || item.chosen_action === "standard_scan") && !(item as any).scan_url && item.tenant_id
```

Dette viser "Upload scan"-knappen med det samme for begge scan-handlinger, uanset om det er scan-dagen eller ej.

