

## Prisoversigt og standardhandling på indstillingssiden

### Overblik

Tilføj to nye sektioner på SettingsPage:
1. **Prisoversigt** — read-only tabel der viser priser/betingelser for breve og pakker baseret på brugerens lejertype (Lite/Standard/Plus)
2. **Standardhandling** — brugeren vælger sin standard handling for breve og pakker (gemmes i `tenants`-tabellen)
3. **Første login-tvang** — hvis standardhandling ikke er valgt, vises en modal/onboarding-skærm der kræver valg før brugeren kan fortsætte

### Database-ændringer

Tilføj to nye kolonner til `tenants`:

| Kolonne | Type | Nullable | Default |
|---|---|---|---|
| `default_mail_action` | text | YES | NULL |
| `default_package_action` | text | YES | NULL |

Gyldige værdier for breve: `send`, `afhentning`, `scan`
Gyldige værdier for pakker: `send`, `afhentning`

### SettingsPage.tsx — nye kort

**Kort 1: "Breve — priser og betingelser"**
Vis en tabel baseret på den uploadede oversigt. Indholdet er hardcodet i koden og filtreret efter lejertype. Viser:
- Forsendelsesdag, ekstra forsendelse pris, ekstra scanning pris, ekstra afhentning pris
- Forklaring af hvad der er inkluderet

**Kort 2: "Pakker — priser og betingelser"**
Tilsvarende for pakker: håndteringsgebyr, afhentningsbetingelser, forsendelse.

**Kort 3: "Standardhandling"**
To Select-dropdowns:
- "Standard handling for breve" (Forsendelse / Afhentning / Scanning)
- "Standard handling for pakker" (Forsendelse / Afhentning)
- Gem-knap

Kun vist for Lite/Standard/Plus (Fastlejer, Nabo, Retur til afsender har andre regler).

### Første login — tvungen valg

Ny komponent `DefaultActionSetup` (dialog/modal):
- Vises når `selectedTenant.default_mail_action` eller `default_package_action` er `null`
- Kræver valg af begge standardhandlinger før modal kan lukkes
- Vises i `Index.tsx` (eller `TenantDashboard.tsx`) for tenant-brugere
- Blokerer adgang til resten af dashboardet indtil valgt

### Fil-ændringer

| Fil | Ændring |
|---|---|
| Database migration | `ALTER TABLE tenants ADD COLUMN default_mail_action text, ADD COLUMN default_package_action text` |
| `src/pages/SettingsPage.tsx` | Tilføj prisoversigt-kort + standardhandling-kort |
| `src/components/DefaultActionSetup.tsx` | Ny modal-komponent til første-login valg |
| `src/pages/TenantDashboard.tsx` | Vis `DefaultActionSetup` modal hvis standardhandlinger mangler |
| `src/hooks/useTenants.tsx` | Ingen ændringer nødvendige (henter allerede tenant_types) |

### Prisdata (hardcodet i koden)

**Breve:**

| | Lite | Standard | Plus |
|---|---|---|---|
| Forsendelsesdag | Første torsdag i måneden | Hver torsdag | Hver torsdag |
| Ekstra forsendelse | 50 kr. + porto | Ingen ekstra | Ingen ekstra |
| Ekstra scanning | 50 kr. (skal bookes) | 30 kr. (skal bookes) | 0 kr. (skal bookes) |
| Ekstra afhentning | 50 kr. (skal bookes) | 30 kr. (skal bookes) | 0 kr. (skal bookes) |

**Pakker:**

| | Lite | Standard | Plus |
|---|---|---|---|
| Håndteringsgebyr | 50 kr. | 30 kr. | 10 kr. |
| Afhentning | Hver torsdag efter aftale | Hver torsdag efter aftale | Efter aftale |
| Forsendelse | Porto tillægges | Porto tillægges | Porto tillægges |

