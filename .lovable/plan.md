

## Plan: Fjern "Afsender"-kolonnen fra Operatør-dashboard

### Ændring

**Fil:** `src/pages/OperatorDashboard.tsx`

Fjern to steder:
1. `<TableHead>Afsender</TableHead>` i header-rækken
2. `<TableCell>{item.sender_name ?? "—"}</TableCell>` i body-rækken

