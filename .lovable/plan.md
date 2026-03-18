

## Plan: Operatør kan se lejerens dashboard fra lejer-detaljesiden

### Idé
Tilføj en "Vis som lejer"-knap på `/tenants/:id`-siden, som navigerer til en ny route `/tenants/:id/dashboard`. Her renderes `TenantDashboard`-komponenten i read-only-tilstand med den specifikke lejers data — inkl. sidebar, header, kort, posttabel osv. — så operatøren ser præcis det samme som lejeren.

### Ændringer

**1. Tilføj prop til TenantDashboard** (`src/pages/TenantDashboard.tsx`)
- Tilføj valgfri prop `overrideTenantId?: string` som, når sat, bruges i stedet for `useTenants()` til at bestemme den aktive lejer
- Når `overrideTenantId` er sat: hent tenant-data direkte fra databasen (samme query som TenantDetailPage), skjul `TenantSelector`, og vis en "Tilbage til lejer"-knap øverst

**2. Ny route og side** (`src/pages/TenantViewPage.tsx`)
- Ny side der wrapper `TenantDashboard` med `overrideTenantId={id}` fra URL-params
- Indkapslet i `AppLayout` med en header der viser firmanavn og "Tilbage"-knap

**3. Tilføj route** (`src/App.tsx`)
- Ny protected route: `/tenants/:id/dashboard`

**4. Tilføj knap på TenantDetailPage** (`src/pages/TenantDetailPage.tsx`)
- Tilføj en "Vis som lejer"-knap (med `Eye`-ikon) ved siden af firmanavnet eller i header-området, som navigerer til `/tenants/:id/dashboard`

### Ændrede filer
- `src/pages/TenantDashboard.tsx` — tilføj `overrideTenantId` prop-support
- `src/pages/TenantViewPage.tsx` — ny fil
- `src/pages/TenantDetailPage.tsx` — tilføj "Vis som lejer"-knap
- `src/App.tsx` — ny route

