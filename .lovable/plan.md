

## "Spor pakken" som rigtig knap + vis på operatør-siden

### Ændringer

**1. `src/pages/TenantDashboard.tsx`** (linje 811-823)
- Ændr knappen fra `variant="link"` til `variant="outline"` med synlig styling (border, padding, teal/blå farve) så den tydeligt skiller sig ud som en klikbar knap.

**2. `src/pages/OperatorDashboard.tsx`** (linje 589-591, status-cellen)
- Efter status-badge, tilføj en "Spor pakken"-knap der vises når `item.status === "sendt_med_postnord"` og `item.tracking_number` eksisterer.
- Knappen åbner `https://tracking.postnord.com/da/tracking?id={tracking_number}` i nyt vindue.
- Samme styling som på lejer-siden.

| Fil | Ændring |
|---|---|
| `TenantDashboard.tsx` | Ændr "Spor pakken" til outline-knap med tydelig styling |
| `OperatorDashboard.tsx` | Tilføj "Spor pakken"-knap i status-cellen for sendte pakker |

