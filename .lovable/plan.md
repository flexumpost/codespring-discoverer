

## Ret Lite-forsendelseslogik og lås handlinger dagen før forsendelse

### Forretningslogik (opsummering)

- **Lite breve**: Sendes den første torsdag i måneden. Breve modtaget mellem to første-torsdage samles op til den næste.
- **Standard/Plus**: Sendes den førstkommende torsdag (uændret).
- **Alle**: Dagen før forsendelse (onsdag) pakkes brevene i kuverter. Fra den dag skal handlinger være låst — kun "Arkivér" er mulig.

### Ændringer

| Fil | Ændring |
|---|---|
| `src/pages/TenantDashboard.tsx` | Ret `getFirstThursdayOfNextMonth` → `getFirstThursdayOfMonth` så den returnerer første torsdag i **indeværende** måned, og hvis den dato allerede er passeret, returnerer første torsdag i **næste** måned |
| `src/pages/TenantDashboard.tsx` | Tilføj logik der låser handlingsvalg (viser kun "Arkivér") når dagens dato ≥ forsendelsesdato minus 1 dag (kuvertpakningsdagen) |

### Kodedetaljer

**1. Ret `getFirstThursdayOfNextMonth` → `getFirstThursdayOfMonth`**

```typescript
function getFirstThursdayOfMonth(): Date {
  const now = new Date();
  // Første torsdag i denne måned
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfWeek = first.getDay();
  const offset = (4 - dayOfWeek + 7) % 7;
  const firstThursday = new Date(now.getFullYear(), now.getMonth(), 1 + offset);
  
  // Hvis den allerede er passeret, tag første torsdag i næste måned
  if (firstThursday <= now) {
    const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const month = (now.getMonth() + 1) % 12;
    const nextFirst = new Date(year, month, 1);
    const nextDow = nextFirst.getDay();
    const nextOffset = (4 - nextDow + 7) % 7;
    return new Date(year, month, 1 + nextOffset);
  }
  return firstThursday;
}
```

**2. Lås handlinger fra dagen før forsendelse**

I handlings-sektionen (linje ~496-530), tilføj et check:

```typescript
const shippingDate = getNextShippingDate(tenantTypeName, item.mail_type);
const today = new Date();
today.setHours(0, 0, 0, 0);
shippingDate.setHours(0, 0, 0, 0);
const packingDay = new Date(shippingDate);
packingDay.setDate(packingDay.getDate() - 1);
const isLocked = today >= packingDay;
```

Når `isLocked` er true og brevet ikke allerede er arkiveret, vises kun "Arkivér"-knappen (samme som `scanExpired`-logikken).

**3. Opdater memory**

Forsendelseslogikken for Lite ændres fra "første torsdag i **efterfølgende** måned" til "første torsdag i **måneden** (hvis ikke passeret, ellers næste måned)".

