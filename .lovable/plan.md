

## Ændr rækkefølge på lejertype-dropdown

### Ændring

**`src/pages/TenantDetailPage.tsx`** — linje 49-56

Fjern `.order("name")` fra tenant_types-queryen og sortér i stedet manuelt i den ønskede rækkefølge:

1. Fastlejer
2. Lite
3. Standard
4. Plus
5. Retur til afsender
6. Nabo

Implementeres ved at definere en `TYPE_ORDER`-array og sortere `data` efter denne rækkefølge inden return.

| Fil | Ændring |
|---|---|
| `src/pages/TenantDetailPage.tsx` | Sortér tenant_types i fast rækkefølge i stedet for alfabetisk |

