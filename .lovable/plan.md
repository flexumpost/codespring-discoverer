

## Tilføj lejertypeskift på operatørens lejerdetalje-side

### Ændring

**`src/pages/TenantDetailPage.tsx`**
- Hent alle `tenant_types` via en ekstra query
- I "Virksomhed"-kortet: tilføj en `Select`-dropdown under firmanavn, der viser alle lejertyper og er pre-selected med den aktuelle `tenant_type_id`
- Tilføj en `useMutation` der opdaterer `tenant_type_id` på `tenants`-tabellen
- Vis en Gem-knap der kun er aktiv når typen er ændret

Kun denne side ændres — `SettingsPage` (lejerens egen side) forbliver uændret og viser fortsat lejertypen som read-only badge.

### Teknisk detalje

Dropdown-værdier er `tenant_types.id` (uuid). Ved gem opdateres `tenants.tenant_type_id`. Badge i headeren opdateres efter invalidation af queryen.

| Fil | Ændring |
|---|---|
| `src/pages/TenantDetailPage.tsx` | Tilføj tenant_types query, Select-dropdown i Virksomhed-kort, mutation for typeskift |

