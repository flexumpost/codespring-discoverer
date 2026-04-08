

## Porto-dropdown på ShippingPrepPage + OfficeRnD-synkronisering

### Oversigt
Tilføj en porto-dropdown til hvert brev på forsendelsessiden, så operatøren kan angive vægtkategori. Porto-valget gemmes i databasen og overføres som separat gebyr til OfficeRnD ved afsendelse.

### Trin 1: Database — ny kolonne på mail_items
Tilføj `porto_option text` (nullable) til `mail_items`-tabellen via migration. Mulige værdier: `dk_0_100`, `dk_100_250`, `udland_0_100`, `udland_100_250`.

### Trin 2: Frontend — Porto-dropdown i ShippingPrepPage
- Tilføj state `portoSelections: Record<string, string>` for porto-valg per mail item.
- For hvert brev-item i forsendelseslisten (brev-tab, kun Lite/Standard lejere):
  - Vis en `<Select>` dropdown efter gebyr-teksten.
  - Valgmuligheder baseret på `shipping_country`:
    - Danmark: "DK 0-100g (18,40 kr.)" / "DK 100-250g (36,80 kr.)"
    - Udland: "Udland 0-100g (46,00 kr.)" / "Udland 100-250g (92,00 kr.)"
  - Plus-lejere: ingen dropdown (gratis porto).
- Ved klik "Send": gem `porto_option` på hvert brev-item inden status-opdatering.

### Trin 3: Backend — Separat porto-gebyr i sync-officernd-charge
- Udvid `sync-officernd-charge/index.ts`:
  - Hent `porto_option` fra mail_item.
  - Hvis `porto_option` er sat og tier er Lite/Standard:
    - Map til OfficeRnD plan-navn (matcher de eksisterende planer i OfficeRnD):
      - `dk_0_100` → "DAO Porto Danmark (0 - 100 g.) kr. 18,4"
      - `dk_100_250` → "DAO Porto Danmark (100 - 250 g.) kr. 36,8"
      - `udland_0_100` → "DAO Porto Udland (0 - 100 g.) kr. 46"
      - `udland_100_250` → "DAO Porto Udland (100 - 250 g.) kr. 92"
    - Map til beløb: 18.40, 36.80, 46.00, 92.00
    - Opret et separat gebyr i OfficeRnD med den matchede plan.
    - Log porto-gebyret separat i `officernd_sync_log`.

### Trin 4: Trigger-tilpasning
Den eksisterende trigger fyrer ved status-skift til `sendt_med_dao`. Porto-gebyret oprettes i samme kald som hovedgebyret, så ingen trigger-ændringer er nødvendige.

### Tekniske detaljer

| Komponent | Ændring |
|-----------|---------|
| Migration | `ALTER TABLE mail_items ADD COLUMN porto_option text` |
| ShippingPrepPage.tsx | Porto `<Select>` dropdown per brev-item, gem ved send |
| sync-officernd-charge | Porto plan-mapping + separat gebyr-oprettelse |
| officernd_sync_log | Porto-entries med dedikeret plan_name |

