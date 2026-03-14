

## Tilføj "Kalender" og "Templates" tabs til operatør-indstillinger

### Oversigt
To nye faner tilføjes i OperatorSettingsTabs: en kalender til helligdage/lukkedage (som blokerer afhentninger) og en template-editor til e-mail-skabeloner.

### Database

**Ny tabel: `closed_days`**
- `id` uuid PK
- `date` date NOT NULL UNIQUE — den lukkede dag
- `label` text — valgfri beskrivelse (f.eks. "Kristi himmelfartsdag")
- `created_at` timestamptz DEFAULT now()

RLS: Operators CRUD, authenticated SELECT.

**Ny tabel: `email_templates`**
- `id` uuid PK
- `slug` text NOT NULL UNIQUE — identifikator (f.eks. `welcome`, `new_shipment`, `scan_ready`, `pickup_confirmed`, `pickup_reminder`, `operator_new_request`)
- `subject` text NOT NULL — emnelinjen
- `body` text NOT NULL — brødtekst (understøtter simpel formatering som pricing)
- `audience` text NOT NULL — `tenant` eller `operator`
- `updated_at` timestamptz DEFAULT now()

RLS: Operators CRUD, authenticated SELECT. Seed med standardtemplates for de 6 nævnte typer.

### Nye komponenter

**`src/components/ClosedDaysCalendar.tsx`**
- Viser en `Calendar` (DayPicker) i `multiple` mode med markerede lukkedage
- Liste under kalenderen med alle lukkedage (dato + label), sorteret kronologisk
- Klik på en dag i kalenderen åbner en lille dialog til at tilføje/fjerne lukkedag med valgfri label
- CRUD mod `closed_days`-tabellen

**`src/components/EmailTemplatesEditor.tsx`**
- Viser en liste med alle templates grupperet i to sektioner: "Lejer" og "Operatør"
- Klik på en template åbner inline-redigering med `subject` og `body` felter
- Gem-knap pr. template med optimistisk opdatering
- Understøtter samme formatering som pricing (`\n`, `**bold**`, `##heading`)

### Ændringer i eksisterende filer

**`src/components/OperatorSettingsTabs.tsx`**
- Import de to nye komponenter
- Tilføj to nye `TabsTrigger`/`TabsContent` for "Kalender" og "Templates"

### Afhentnings-integration (senere fase)
Pickup-kalenderen i TenantDashboard skal fremover krydstjekke `closed_days` for at blokere lukkede dage. Denne plan opretter kun tabellen og UI — integrationen med afhentningslogikken kan tilføjes separat.

### Fil-oversigt
| Fil | Handling |
|---|---|
| `closed_days` tabel | Ny migration |
| `email_templates` tabel + seed | Ny migration |
| `src/components/ClosedDaysCalendar.tsx` | Ny |
| `src/components/EmailTemplatesEditor.tsx` | Ny |
| `src/components/OperatorSettingsTabs.tsx` | Opdater |

