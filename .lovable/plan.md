

## "Afvis handling" — operatør kan afvise en lejers ønskede handling

### Problem
Operatøren har ingen mulighed for at afvise en handling (f.eks. scanning af et magasin der ikke kan scannes). Der mangler et flow til at nulstille handlingen med en begrundelse, og lejeren ser ikke at handlingen er afvist.

### Løsning

#### 1. Ny kolonne: `action_rejected_reason` (text, nullable)
Gemmer operatørens begrundelse for afvisningen. Når feltet har en værdi, betragtes handlingen som afvist.

#### 2. OperatorMailItemDialog — "Afvis handling"-knap
- Vises kun når `item.chosen_action` har en værdi (der er en handling at afvise).
- Ved klik åbnes en AlertDialog med et textarea til begrundelse (påkrævet).
- Ved bekræftelse: `chosen_action` nulstilles til `null`, `action_rejected_reason` sættes til begrundelsen, `note_read` sættes til `false` (så lejeren ser besked-ikonet).
- Logges automatisk via eksisterende trigger (`action_cleared` + `notes_changed`).

#### 3. TenantDashboard — "Handling afvist" status
- `getStatusDisplay()` tjekker `action_rejected_reason` som første prioritet: hvis den har værdi og `chosen_action` er `null`, returneres `["Handling afvist"]`.
- I tabel-cellen for status: Wraps badge + note-ikon i en div med en Tooltip der viser `action_rejected_reason` ved hover.
- `MessageSquare`-ikonet vises ved status-teksten (ikke kun ved forsendelsesnr.) for afviste handlinger.

#### 4. Nulstilling af afvisning
- Når lejeren vælger en ny handling, ryddes `action_rejected_reason` automatisk (sæt til `null` ved action-update).

### Database-migration
```sql
ALTER TABLE public.mail_items 
  ADD COLUMN action_rejected_reason text;
```

### Filer
- **Migration**: Tilføj `action_rejected_reason` kolonne
- **Ændret**: `src/components/OperatorMailItemDialog.tsx` — tilføj "Afvis handling"-knap med begrundelsesdialog
- **Ændret**: `src/pages/TenantDashboard.tsx` — vis "Handling afvist" status med tooltip der viser begrundelsen
- **Ændret**: `src/pages/TenantDashboard.tsx` — ryd `action_rejected_reason` når lejeren vælger ny handling

