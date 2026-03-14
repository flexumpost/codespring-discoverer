

## Forsendelseslog: Historik-panel for mail items

### Overblik
Opretter en `mail_item_logs`-tabel der automatisk logger alle ændringer på forsendelser (status, handling, scan, etc.), samt en Sheet-komponent der vises når man klikker på "Modtaget"-datoen i tabellen.

### Database

**Ny tabel: `mail_item_logs`**
```sql
CREATE TABLE public.mail_item_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_item_id uuid NOT NULL REFERENCES public.mail_items(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,        -- f.eks. 'oprettet', 'status_ændret', 'handling_valgt', 'scan_uploadet', 'tildelt_lejer'
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mail_item_logs ENABLE ROW LEVEL SECURITY;
```

RLS: Operatører kan læse alle logs, lejere kan læse logs for egne forsendelser (via `my_tenant_ids()`).

**Trigger-funktion** på `mail_items` (BEFORE UPDATE) der automatisk logger ændringer i `status`, `chosen_action`, `scan_url`, `tenant_id` og `notes`. Bruger `auth.uid()` til at registrere hvem der foretog ændringen.

**INSERT-trigger** der logger oprettelse af nye forsendelser.

### Frontend

**1. Ny komponent: `MailItemLogSheet.tsx`**
- Bruger `Sheet` (side="right") fra shadcn.
- Modtager `mailItemId` og `open`/`onOpenChange` props.
- Fetcher logs fra `mail_item_logs` joinet med `profiles` for at vise brugernavne.
- Viser en vertikal tidslinje med:
  - Tidsstempel (dato + klokkeslæt)
  - Handling (f.eks. "Status ændret fra Ny til Afventer handling")
  - Bruger (navn eller "System")

**2. TenantDashboard.tsx — linje 799**
Gør "Modtaget"-datoen klikbar → åbner `MailItemLogSheet` med det pågældende mail_item_id.

**3. OperatorDashboard.tsx — linje 452**
Samme ændring: klikbar dato → åbner log-sheet.

### Handlings-labels i loggen
Mapping fra tekniske værdier til danske labels:
- `created` → "Forsendelse oprettet"
- `status_changed` → "Status ændret fra [X] til [Y]"
- `action_chosen` → "Handling valgt: [Y]"
- `action_cleared` → "Handling nulstillet"
- `scan_uploaded` → "Scanning uploadet"
- `tenant_assigned` → "Tildelt lejer: [Y]"

