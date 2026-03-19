

## Fix: Operatør-dashboard — Standard scanning for breve uden chosen_action

### Problem
På operatør-dashboardet vises Standard-lejeres breve med default scanning som "Scanning bestilt - modtaget 19. marts kl. 12:23". Det er forkert — det skal vise "Standard scanning [næste torsdag]", ligesom på lejer-dashboardet. Den nuværende tekst antyder 24-timers scanning, men Standard scanning skal ske den efterfølgende torsdag.

### Ændring

**`src/pages/OperatorDashboard.tsx` — `getOperatorStatusDisplay` (linje 186-192)**

I det eksisterende `if (defaultAction === "scan")` block, tilføj en check for Standard-lejere:

```typescript
if (defaultAction === "scan") {
  if (item.scan_url) {
    const readLabel = item.status === "laest" ? "Læst" : "Ulæst";
    return `Scannet — ${readLabel}`;
  }
  const tenantType = item.tenants?.tenant_types?.name;
  if (tenantType === "Standard") {
    const scanDate = getShippingDate("Standard", "brev");
    return `Standard scanning ${formatDanishDate(scanDate)}`;
  }
  const received = new Date(item.received_at);
  return `Scanning bestilt - modtaget ${formatDanishDateTime(received)}`;
}
```

Én ændring, ingen andre filer berørt.

