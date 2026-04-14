

## Vis alle virksomheder i Lejervisning

### Problem
Når en operatør bruger "Lejervisning" for Bonlulu, vises kun Bonlulu — selvom den samme bruger (kontakt@erhvervsgaver.dk) også ejer Erhvervsgaver. Det skyldes at `TenantDashboard` med `overrideTenantId` kun henter den ene lejer og skjuler virksomhedsvælgeren.

### Løsning
Udvid Lejervisningen så den finder alle virksomheder der tilhører den valgte lejers bruger, og viser virksomhedsvælgeren — præcis som brugeren selv ville opleve det ved login.

### Ændringer

**1. `src/pages/TenantDashboard.tsx`**
- Når `overrideTenantId` er sat: hent den valgte lejers `user_id`, og derefter alle lejere med samme `user_id` + alle via `tenant_users`
- Vis `TenantSelector` også i override-mode (med alle fundne lejere)
- Lad operatøren skifte mellem virksomhederne i lejervisningen

**2. `src/pages/TenantViewPage.tsx`**
- Opdater overskriften dynamisk når operatøren skifter virksomhed i vælgeren

### Tekniske detaljer
- En ekstra query henter først `user_id` fra den overridede lejer, derefter alle lejere tilknyttet den bruger (via `tenants.user_id` og `tenant_users`)
- `TenantSelector`-betingelsen ændres fra `!overrideTenantId` til `tenants.length > 1` (eller altid vis den)
- Navigationen i headeren opdateres via en callback eller state-sync

