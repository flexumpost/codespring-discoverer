

## Nedtælling for fysisk opbevaring af scannede breve (30 dage)

Når et brev er scannet og scanningen er uploadet, vises i status-kolonnen hvor mange dage der er tilbage, inden det fysiske brev destrueres. Efter 30 dage blokeres handlingsvalg, og brevet kan kun arkiveres.

### Logik

- Startpunkt for de 30 dage: tidspunktet hvor `scan_url` blev sat (registreres via `updated_at` feltet, som allerede opdateres automatisk ved upload)
- Beregning: `daysLeft = 30 - dageSiden(updated_at)` -- men `updated_at` kan opdateres af andre ting, se nedenfor
- For praecis sporbarhed tilfojes et nyt felt `scanned_at` til `mail_items` tabellen

### Aendringer

**1. Database: nyt felt `scanned_at`**
- Tilfoej `scanned_at timestamptz` kolonne til `mail_items` (nullable, default null)
- Opret en trigger der automatisk saetter `scanned_at = now()` naar `scan_url` aendres fra null til en vaerdi (saa operatoerer ikke skal goere noget ekstra)
- Bagudkompatibilitet: Koor en migration der saetter `scanned_at = updated_at` for eksisterende raekker der allerede har `scan_url`

**2. `getStatusDisplay()` i TenantDashboard.tsx**
- Naar `chosen_action = 'scan'` og `scan_url` er sat: beregn `daysLeft = 30 - daysSince(scanned_at)`
- Hvis `daysLeft > 0`: vis "Gemmes i [daysLeft] dage" som undertekst
- Hvis `daysLeft <= 0`: vis "Fysisk brev destrueret"

**3. Bloker handlingsvalg naar daysLeft <= 0**
- I tabel-raekken: naar et scannet brev har 0 dage tilbage, deaktiveres Select-dropdown'en
- Vis kun "Arkiver" som mulig handling, eller vis slet ingen dropdown og vis i stedet en "Arkiver"-knap

### Tekniske detaljer

| Fil / Ressource | AEndring |
|---|---|
| Database migration | `ALTER TABLE mail_items ADD COLUMN scanned_at timestamptz;` + trigger + backfill |
| `src/pages/TenantDashboard.tsx` | Opdater `getStatusDisplay()` med dage-beregning; betinget deaktivering af handlings-dropdown |
| `src/integrations/supabase/types.ts` | Opdateres automatisk efter migration |

### Eksempel paa statusvisning

| Situation | Status-kolonne |
|---|---|
| Scannet for 5 dage siden | Badge: "Ulaest" / Undertekst: "Gemmes i 25 dage" |
| Scannet for 30+ dage siden | Badge: "Fysisk brev destrueret" / Handling: kun Arkiver |

