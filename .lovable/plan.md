

## Plan: Alfabetisk sortering, konsistent placering og lejertype-badge

### Ændringer

**1. `src/hooks/useTenants.tsx` — Alfabetisk sortering**
- Sorter `tenants`-arrayet efter `company_name` (case-insensitive) inden det returneres, så rækkefølgen er konsistent overalt.

**2. `src/components/TenantSelector.tsx` — Lejertype-badge**
- Udvid `Tenant`-interfacet til at inkludere `tenant_types` med `name`.
- Vis lejertype som et lille badge under virksomhedsnavnet (eller ved siden af "Aktiv") med de eksisterende farvekoder fra `TYPE_COLORS` (Lite=blå, Standard=grøn, Plus=cyan, Fastlejer=ravgul osv.).

**3. Konsistent placering (venstrejusteret) på alle sider**
- **SettingsPage** og **ShippingAddressPage**: Flyt `TenantSelector` fra højre side (`justify-between`) til venstre, under overskriften — samme layout som TenantDashboard.
- TenantDashboard har allerede korrekt placering (venstre, over indhold).

### Resultat
- Kort sorteret A-Å på alle sider
- Lejertype vises som farvekodet badge i hvert kort
- Konsistent venstrejusteret placering på dashboard, indstillinger og forsendelsesadresse

