

## Plan: Tilføj mail-type filter (Alle / Breve / Pakker) til begge dashboards

### Ændringer

**1. OperatorDashboard.tsx**
- Tilføj ny state: `mailTypeFilter: "all" | "brev" | "pakke"` (default `"all"`)
- Indsæt 3 radio buttons (via `RadioGroup` fra ui/radio-group) mellem søgefeltet og tabellen (linje ~506-518)
- Filtrer `sortedItems` baseret på `mailTypeFilter` før rendering — `item.mail_type === mailTypeFilter` eller vis alle

**2. TenantDashboard.tsx**
- Tilføj ny state: `mailTypeFilter: "all" | "brev" | "pakke"` (default `"all"`)
- Indsæt 3 radio buttons mellem cards-sektionen og tabellen (linje ~793)
- Filtrer `mailItems` baseret på `mailTypeFilter` før rendering

### UI
Radio buttons placeres i en vandret række med labels: **Alle**, **Breve**, **Pakker**. Bruger eksisterende `RadioGroup`/`RadioGroupItem` komponenter fra projektet.

### Filer der ændres
- `src/pages/OperatorDashboard.tsx`
- `src/pages/TenantDashboard.tsx`

