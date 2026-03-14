

## Adskil pickup-data fra noter + tilføj "ulæst note"-indikator

### Problem
1. `notes`-feltet bruges til to formål: pickup-tidspunkt (`PICKUP:...`) og operatør-noter. Lejeren ser derfor rå PICKUP-data som en note.
2. Der er ingen indikation på operatør-dashboardet om at en forsendelse har en ulæst note.

### Løsning

#### 1. Ny kolonne: `pickup_date` (timestamptz)
Tilføj en dedikeret kolonne til pickup-tidspunktet, så `notes` kun bruges til operatør-beskeder.

#### 2. Ny kolonne: `note_read` (boolean, default true)
Når operatøren skriver en note, sættes `note_read = false`. Når lejeren åbner forsendelsen og ser noten, sættes `note_read = true`.

#### 3. Database-migration
```sql
ALTER TABLE public.mail_items ADD COLUMN pickup_date timestamptz;
ALTER TABLE public.mail_items ADD COLUMN note_read boolean NOT NULL DEFAULT true;
-- Migrate existing PICKUP data
UPDATE public.mail_items
  SET pickup_date = (notes::text REPLACE 'PICKUP:' WITH '')::timestamptz,
      notes = NULL
  WHERE notes LIKE 'PICKUP:%';
```

#### 4. Kodeændringer

**`src/pages/TenantDashboard.tsx`**:
- Brug `item.pickup_date` i stedet for at parse `notes` med `PICKUP:`-præfiks
- Gem pickup-dato i `pickup_date` i stedet for `notes`
- Når lejeren åbner detalje-dialogen og item har `notes` + `note_read === false`, kald update for at sætte `note_read = true`
- Vis ikke noter der starter med `PICKUP:` (cleanup, men efter migration bør det ikke ske)

**`src/pages/OperatorDashboard.tsx`**:
- Brug `item.pickup_date` i stedet for at parse `notes`
- Vis et ikon/badge (f.eks. en lille boble) på forsendelsesrækken når `notes` har indhold og `note_read === false`
- Opdater gebyr-beregning til at bruge `pickup_date`

**`src/components/OperatorMailItemDialog.tsx`**:
- Når operatøren gemmer en note (og noten er ændret), sæt `note_read = false`

### Filer
- **Migration**: Ny migration for `pickup_date` + `note_read` kolonner + data-migration
- **Ændret**: `src/pages/TenantDashboard.tsx` — brug `pickup_date`, marker noter som læst
- **Ændret**: `src/pages/OperatorDashboard.tsx` — brug `pickup_date`, vis ulæst-note indikator
- **Ændret**: `src/components/OperatorMailItemDialog.tsx` — sæt `note_read = false` ved note-ændring

