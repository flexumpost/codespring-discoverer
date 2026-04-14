

## Porto-oversigt i operatørindstillinger

### Formål
Ny "Porto" fane under operatørindstillinger, der viser portoforbrug fordelt på lejertype og porto-kategori — så det kan sammenlignes med DAO-fakturaer.

### Ændringer

**1. Ny komponent: `src/components/PostageOverviewTab.tsx`**

- Henter alle `mail_items` med `porto_option IS NOT NULL`, joinet med `tenants` → `tenant_types` for at få tier-navn
- Viser data i en tabel med:
  - Rækker grupperet efter porto-kategori (dk_0_100, dk_100_250, udland_0_100, udland_100_250, dk_pakke_0_1, osv.)
  - Kolonner: Porto-type, Antal (Lite), Antal (Standard), Antal (Plus), Antal Total, Beløb Total
  - Porto-priser mappe hardcoded (samme som ShippingPrepPage): dk_0_100 = 18,40 kr., dk_100_250 = 36,80 kr., osv.
  - Sumrække nederst med totaler
- Opdelt i to sektioner: **Breve** og **Pakker** (matcher DAO-fakturaens opdeling)
- Datofilter (fra/til) så man kan filtrere på en specifik faktureringsperiode
- Viser både antal og beløb, så det direkte kan sammenlignes med DAO-fakturaen

**2. Opdater `src/components/OperatorSettingsTabs.tsx`**

- Tilføj ny `TabsTrigger` "Porto" og tilhørende `TabsContent` med `PostageOverviewTab`

**3. Tilføj oversættelser i `da.json` og `en.json`**

- Nøgler for fane-label, kolonneoverskrifter, datofilter, og porto-kategorinavne

### Tekniske detaljer

Porto-priser mapping (fra ShippingPrepPage):
- Breve: dk_0_100 (18,40), dk_100_250 (36,80), udland_0_100 (46,00), udland_100_250 (92,00)
- Pakker: dk_pakke_0_1 (48,00), dk_pakke_1_2 (57,60), dk_pakke_2_5 (77,60), dk_pakke_5_10 (101,60), dk_pakke_10_15 (133,60), dk_pakke_15_20 (141,60)

Query henter data via Supabase client med RLS (operatør har adgang til alle mail_items). Datofilteret filtrerer på `received_at` eller den dato forsendelsen blev sendt.

