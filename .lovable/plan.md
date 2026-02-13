

## Handlingsspecifik status og afhentningskalender

### Overblik

Status-kolonnen paa lejer-dashboardet viser nu handlingsspecifik tekst baseret paa den valgte handling. "Afhentning" aabner en kalender-popup. Afhentningstidspunktet gemmes i det eksisterende `notes`-felt (ingen ny kolonne) og vises i Status-kolonnen.

### Aendringer

**1. Status-kolonnen i TenantDashboard.tsx**

Status-kolonnen viser dynamisk tekst baseret paa `chosen_action`:

| chosen_action | Status-tekst |
|---|---|
| (ingen) + Fastlejer | "Laegges paa kontoret" |
| (ingen) + Lite/Standard/Plus | "Sendes paa naeste forsendelsesdag" + [beregnet dato] |
| `scan` (uden scan_url) | "Afventer scanning" + "Scannes inden for 24 timer" |
| `scan` (med scan_url) | Normal status (Ulaest/Laest) |
| `send` | "Sendes paa naeste forsendelsesdag" + [beregnet dato] |
| `afhentning` | "Bestilt afhentning" + [valgt tidsrum fra notes] |
| `destruer` | "Destrueret" |
| `daglig` | "Laegges paa kontoret" |

Den nuvaerende forsendelsesdag-tekst under "Vaelg handling" flyttes til Status-kolonnen.

**2. Afhentning: Kalender-popup**

Naar lejeren vaelger "Afhentning" i dropdown:
- En Dialog aabnes med en kalender og tidsvaelger
- Kun hverdage kan vaelges (ikke weekender, ikke fortidige datoer)
- Tidsintervaller paa 1 time:
  - Mandag-torsdag: 09:00-10:00, 10:00-11:00, ..., 16:00-17:00
  - Fredag: 09:00-10:00, 10:00-11:00, ..., 14:00-15:00
- Afhentningstidspunktet gemmes i det eksisterende `notes`-felt som en struktureret streng (f.eks. "PICKUP:2025-02-20T10:00")
- Status-kolonnen viser: "Bestilt afhentning" + f.eks. "Torsdag den 20. februar kl. 10:00-11:00"

**3. "Vaelg handling"-kolonnen forenkles**

Kolonnen beholder kun dropdown-menuen. Al status/forsendelsesdag-tekst flyttes til Status-kolonnen.

**4. Operatoer-dashboard**

Under "Afhentes"-kortet vises afhentningstidspunktet (parset fra `notes`) i status-kolonnen for de relevante forsendelser.

### Teknisk detalje

**Lagring af afhentningstidspunkt:**
Brug `notes`-feltet med et praefix saa det kan skelnes fra operatoer-noter:
```text
chosen_action = "afhentning"
notes = "PICKUP:2025-02-20T10:00"
```

**Ny state i TenantDashboard:**
```text
const [pickupDialogItem, setPickupDialogItem] = useState<string | null>(null);
const [pickupDate, setPickupDate] = useState<Date | undefined>();
const [pickupHour, setPickupHour] = useState<string | undefined>();
```

**handleAction opdateres:**
```text
if (action === "afhentning") {
  setPickupDialogItem(id);  // aabner popup
} else if (action === "destruer") {
  setConfirmDestroy(id);
} else {
  chooseAction.mutate({ id, action });
}
```

**Ny mutation til afhentning:**
Gemmer `chosen_action = "afhentning"`, `status = "afventer_handling"` og `notes = "PICKUP:<ISO-dato>"`.

**Status-celle hjelpefunktion:**
```text
function getStatusDisplay(item, tenantTypeName):
  if item.chosen_action === "scan" && !item.scan_url:
    linje 1: "Afventer scanning"
    linje 2: "Scannes inden for 24 timer"
  if item.chosen_action === "send":
    linje 1: "Sendes paa naeste forsendelsesdag"
    linje 2: formatDanishDate(getNextShippingDate(...))
  if item.chosen_action === "afhentning":
    linje 1: "Bestilt afhentning"
    linje 2: parsePickupFromNotes(item.notes)
  if item.chosen_action === "destruer":
    linje 1: "Destrueret"
  if item.chosen_action === "daglig":
    linje 1: "Laegges paa kontoret"
  // Ingen handling valgt:
  if tenantType === "Fastlejer":
    linje 1: "Laegges paa kontoret"
  else:
    linje 1: "Sendes paa naeste forsendelsesdag"
    linje 2: formatDanishDate(getNextShippingDate(...))
```

**Kalender-dialog:**
- Bruger eksisterende Calendar og Select komponenter fra shadcn
- DayPicker med `disabled` der blokerer weekender og fortidige datoer
- Select dropdown med tidsintervaller der skifter baseret paa valgt ugedag
- `pointer-events-auto` paa Calendar for interaktivitet i dialog

**OperatorDashboard.tsx:**
- Parser `notes`-feltet for "PICKUP:"-praefiks
- Viser afhentningstidspunkt i status-cellen for forsendelser med `chosen_action === "afhentning"`

