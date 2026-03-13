

## Plan: Vis standardhandling i stedet for "Ny" i operatør-dashboard

### Problem
Når et brev ikke har nogen `chosen_action`, viser status-kolonnen bare "Ny". Den bør i stedet vise hvilken handling brevet vil få baseret på lejerens standardhandling (`default_mail_action` / `default_package_action`).

### Ændringer i `src/pages/OperatorDashboard.tsx`

1. **Udvid query** — ændr `tenants(company_name)` til `tenants(company_name, default_mail_action, default_package_action)` og opdater `MailItem`-typen.

2. **Tilføj ACTION_LABELS** map (scan → "Åben og scan", send → "Forsendelse", afhentning → "Afhentning", destruer → "Destruer", daglig → "Lig på kontoret").

3. **Opdater `getOperatorStatusDisplay`** — når `chosen_action` er null, slå op i lejerens default action baseret på `mail_type` (brev → `default_mail_action`, pakke → `default_package_action`) og vis den label. Fallback til nuværende `STATUS_LABELS[status]` hvis heller ingen default findes.

