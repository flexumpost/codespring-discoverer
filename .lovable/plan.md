

## Analyse: Realtime-opdatering i Operatør-dashboard

### Nuværende opsætning
Koden er allerede konfigureret korrekt:
- `mail_items` er tilføjet til `supabase_realtime` publication
- Operatør-dashboardet abonnerer på `postgres_changes` med `event: '*'`
- Ved ændringer kaldes `refreshMail()` som henter data på ny

### Muligt problem
Realtime-kanalen kan miste forbindelsen uden at koden opdager det. Der er ingen fejlhåndtering eller reconnect-logik. Når kanalen "dør stille", stopper opdateringerne.

### Løsning
Tilføj robusthed til realtime-abonnementet i `src/pages/OperatorDashboard.tsx`:

1. **Lyt på kanalens status** — brug `.subscribe((status)  => ...)` til at logge og reagere på `CHANNEL_ERROR` eller `TIMED_OUT`
2. **Auto-reconnect** — ved fejl, fjern kanalen og opret en ny efter kort delay
3. **Tilføj `updated_at` i lytteren** — brug `filter` parameter for at sikre at UPDATE-events fanges korrekt

### Teknisk ændring

**Fil:** `src/pages/OperatorDashboard.tsx`

Opdater `useEffect`-blokken (linje 149-162) til:
- Wrap kanal-oprettelse i en funktion der kan genoprettes
- Tilføj status-callback i `.subscribe()` der logger fejl og forsøger reconnect efter 3 sekunder
- Kald `refreshMail()` ved reconnect for at sikre data er synkroniseret

