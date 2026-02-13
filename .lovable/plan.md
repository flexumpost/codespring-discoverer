
## Opdater handlingsvalg og standard-status paa TenantDashboard

### Overblik

Tre aendringer:

1. **Aendr handling efterfoelgende** - Dropdown vises ogsaa naar `chosen_action` allerede er sat (ikke kun ved `status === "ny"`), saa lejeren kan skifte handling.
2. **Standard-handling ved modtagelse** - Naar en forsendelse har status "ny" og endnu ingen valgt handling, vises en standard-tekst baseret paa lejertype:
   - Lite/Standard/Plus: "Sendes paa naeste forsendelsesdag"
   - Fastlejer: "Laegges paa kontoret"
3. **Naeste forsendelsesdag** - Under "Sendes paa naeste forsendelsesdag" vises den konkrete dato:
   - Breve, Lite: Foerste torsdag i naeste maaned
   - Breve, Standard/Plus: Foerstkommende torsdag
   - Pakker, Lite/Standard/Plus: Foerstkommende torsdag

### Aendringer i TenantDashboard.tsx

**1. Dropdown altid tilgaengelig**
- Fjern betingelsen `item.status === "ny"` saa Select-dropdown vises for alle forsendelser der ikke er arkiveret
- Vis den aktuelle `chosen_action` som default-vaerdi i dropdown (saa lejeren ser hvad der er valgt og kan aendre)

**2. Hjaelpefunktion til naeste forsendelsesdag**

Tilfoej en funktion `getNextShippingDate` der beregner:
- `getNextFirstThursdayOfMonth()`: foerste torsdag i naeste maaned (til Lite-breve)
- `getNextThursday()`: foerstkommende torsdag (til Standard/Plus breve og alle pakker)

Formater datoerne paa dansk, f.eks. "Torsdag den 5. marts".

**3. Standard-status tekst**

Naar en forsendelse endnu ikke har en valgt handling (`chosen_action === null`), vis:
- For Lite/Standard/Plus: "Sendes paa naeste forsendelsesdag" + dato
- For Fastlejer: "Laegges paa kontoret"

Denne tekst vises under dropdown-feltet eller som en info-badge.

**4. Lejertype-identifikation**

Brug `selectedTenant?.tenant_types?.name` til at bestemme lejertypen og vaelge den korrekte forsendelsesdag-logik.

### Teknisk detalje

```text
// Hjaelpefunktioner
function getNextThursday(): Date
function getFirstThursdayOfNextMonth(): Date
function formatDanishDate(date: Date): string
  -> "Torsdag den 19. februar"

// I tabel-cellen for "Vaelg handling":
// 1. Vis altid dropdown (undtagen arkiverede)
// 2. Saet defaultValue til item.chosen_action
// 3. Under dropdown: vis forsendelsesdag-info hvis relevant

// Lejertype hentes fra:
const tenantTypeName = (selectedTenant?.tenant_types as any)?.name;
```

### Resultat
- Lejere kan aendre handling efter foerste valg
- Standard-forsendelsesinfo vises automatisk baseret paa lejertype
- Konkrete datoer for naeste forsendelsesdag vises tydeligt
