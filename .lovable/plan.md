

## Ændring af kolonnerækkefølge i operatør-tabellen

Ændrer rækkefølgen i `src/pages/OperatorDashboard.tsx` så "Afsender" flyttes fra position 3 til position 6 (efter "Status").

### Ny rækkefølge

| # | Før | Efter |
|---|-----|-------|
| 1 | Foto | Foto |
| 2 | Type | Type |
| 3 | **Afsender** | **Lejer** |
| 4 | Lejer | Forsendelsesnr. |
| 5 | Forsendelsesnr. | Status |
| 6 | Status | **Afsender** |
| 7 | Modtaget | Modtaget |
| 8 | Scan | Scan |

### Fil der ændres

| Fil | Ændring |
|-----|---------|
| `src/pages/OperatorDashboard.tsx` | Flyt `TableHead` og tilhørende `TableCell` for "Afsender" fra position 3 til position 6 i både header og body |

