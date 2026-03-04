

## Ændr tekst og adfærd ved daysLeft === 0

### Ændringer i `src/pages/TenantDashboard.tsx`

1. **Linje 121**: Ændr statusteksten fra `"Fysisk brev destrueret"` til `"Brevet er destrueret"`
2. Handlingslogikken er allerede korrekt — når `scanExpired` er true (linje 497-509), vises kun en "Arkivér"-knap i stedet for handlings-dropdown. Denne logik forbliver uændret.

| Fil | Ændring |
|---|---|
| `src/pages/TenantDashboard.tsx` | Linje 121: "Fysisk brev destrueret" → "Brevet er destrueret" |

