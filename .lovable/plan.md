

## Opdatér Lite brev-handlinger til at matche specifikationen

### Nuværende vs. ønsket

| Nuværende label | Ny label | Action-nøgle |
|---|---|---|
| Gratis afhentning | Gratis afhentning ✓ | `gratis_afhentning` |
| Hurtig afhentning | **Ekstra afhentning** | `afhentning` |
| Standard forsendelse | **Forsendelse** | `standard_forsendelse` |
| Ekstra forsendelse | Ekstra forsendelse ✓ | `send` |
| Standard scanning | **Gratis scanning** | `standard_scan` |
| Scan nu | Scan nu ✓ | `scan` |
| Destruktion | Destruktion ✓ | `destruer` |

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. Labels (linje 99-106)**
- `afhentning` → "Ekstra afhentning" (fra "Hurtig afhentning")
- `standard_forsendelse` → "Forsendelse" (fra "Standard forsendelse")
- `standard_scan` → "Gratis scanning" (fra "Standard scanning")

**2. Dropdown-rækkefølge (linje 85-92)**
Alle Lite switch-cases opdateres til rækkefølgen:
`gratis_afhentning`, `afhentning`, `standard_forsendelse`, `send`, `standard_scan`, `scan`
(+ `destruer` tilføjes automatisk via `addDestruer`)

Eksisterende action undtaget den aktive handling filtreres som hidtil.

**Hvad ændres IKKE**: Priser, gebyrer, status-tekster og operatør-dashboard forbliver uændret.

