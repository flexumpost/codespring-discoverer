

## Tilføj "Ubehandlet" checkbox til operatør-dashboardet

### Oversigt
Tilføj en checkbox ved siden af radio-knapperne (Alle/Breve/Pakker) der hedder "Ubehandlet". Når den er markeret, filtreres listen til kun at vise forsendelser der stadig kræver behandling — dvs. ikke er afsluttet (sendt, afhentet, destrueret, arkiveret, scannet).

### Definition af "ubehandlet"
En forsendelse er **ubehandlet** hvis den IKKE er i en afsluttet tilstand:
- Status er IKKE `sendt_med_dao`, `sendt_med_postnord`, `sendt_retur`, `arkiveret`
- `chosen_action` er IKKE `afhentet`
- Hvis `chosen_action` er `scan` eller `standard_scan`: kun ubehandlet hvis `scan_url` er tom (ikke scannet endnu)

### Ændringer

| Fil | Ændring |
|-----|---------|
| `src/pages/OperatorDashboard.tsx` | Tilføj `unprocessedOnly` state + checkbox UI + filter-logik |
| `src/i18n/locales/da.json` | Tilføj `"unprocessed": "Ubehandlet"` |
| `src/i18n/locales/en.json` | Tilføj `"unprocessed": "Unprocessed"` |

### Tekniske detaljer

**State (linje ~384):**
```typescript
const [unprocessedOnly, setUnprocessedOnly] = useState(false);
```

**Filter-funktion:**
```typescript
function isUnprocessed(item: MailItem): boolean {
  const doneStatuses = ["sendt_med_dao", "sendt_med_postnord", "sendt_retur", "arkiveret"];
  if (doneStatuses.includes(item.status)) return false;
  if (item.chosen_action === "afhentet") return false;
  if ((item.chosen_action === "scan" || item.chosen_action === "standard_scan") && item.scan_url) return false;
  return true;
}
```

**Filtrering (linje ~536):**
Tilføj `unprocessedOnly`-filter efter `mailTypeFilter`:
```typescript
const afterUnprocessed = unprocessedOnly ? filteredByType.filter(isUnprocessed) : filteredByType;
```

**UI (linje ~607, efter pakke-radio):**
Tilføj en Checkbox med label "Ubehandlet" på samme linje som radio-knapperne.

