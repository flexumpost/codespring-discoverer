

## Ændringer til "Vælg handling"-dropdown

### Problem
1. Dropdown viser den aktuelle `chosen_action` som default — skal være tom
2. "Send" i dropdown skal hedde "Ekstra forsendelse"
3. Når "Ekstra forsendelse" vælges, skal status vise førstkommende torsdag (dette virker allerede via `getStatusDisplay`)

### Ændringer i `src/pages/TenantDashboard.tsx`

| Ændring | Detalje |
|---|---|
| **ACTION_LABELS** (linje 34-40) | Tilføj/ændr `send` label til `"Ekstra forsendelse"` |
| **Select value** (linje 577) | Kun vis chosen_action i dropdown hvis den er en af `availableExtras`, ellers `undefined` (tom) |

Konkret:
- `ACTION_LABELS.send` → `"Ekstra forsendelse"`
- `value={availableExtras.includes(item.chosen_action) ? item.chosen_action : undefined}` — så dropdown er tom når item har standardhandling eller ingen action

