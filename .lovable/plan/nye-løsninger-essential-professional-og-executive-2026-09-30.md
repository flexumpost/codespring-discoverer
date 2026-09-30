# Nye løsninger: Essential, Professional og Executive

De tre nye løsninger oprettes ved siden af Lite, Standard og Plus. De gamle løsninger og deres lejere forbliver uændrede. Nye kunder kan tildeles de nye løsninger manuelt eller via Zoho.

## Betingelser (fra prisbilledet)

| | Essential | Professional | Executive |
|---|---|---|---|
| Gratis scanning | Torsdag | Mandag + torsdag | Alle hverdage |
| Gratis afhentning | Torsdag | Mandag + torsdag | Alle hverdage |
| Gratis forsendelse | Torsdag, porto tillægges | Mandag + torsdag, porto inkluderet | Mandag + torsdag, porto inkluderet |
| Ekstra scanning / afhentning / forsendelse | 30 kr. (+ porto ved forsendelse) | 30 kr. (porto inkluderet) | 0 kr. |
| Pakker | Sendes løbende, 30 kr. + porto | Sendes løbende, 30 kr. + porto | Sendes løbende, 10 kr. + porto |
| Adresse | c/o Flexum Coworking påkrævet | Uden c/o | Uden c/o |
| Virksomheder | 1 | 1 | Op til 2 (drift + holding) |

## Ændringer

1. **Opret løsningerne** med tilladte handlinger og tekster i "Priser og betingelser", som lejerne ser i deres oversigt.
2. **Gratis dage pr. løsning.** Beregningen af næste gratis dag skal kende mandag + torsdag og "alle hverdage". Det bruges af lejerens "Vælg handling"-kort, kalenderen, operatør-dashboardet, sorteringen og listen "Send breve og pakker".
3. **Priser i "Vælg handling"** vises pr. løsning efter tabellen ovenfor.
4. **Gebyrer til OfficeRnD.**
   - Ekstra handlinger koster 30 kr. for Essential og Professional og 0 kr. for Executive.
   - Porto overføres kun for Essential. Hos Professional og Executive er porto inkluderet for breve.
   - Pakker koster 30 eller 10 kr. plus porto.
5. **Standardhandling.** Nye breve får "Forsendelse" på næste gratis dag for løsningen.
6. **Konvolutter og forsendelse.** Hos Professional og Executive er porto inkluderet, så der skal ikke vælges porto for breve. Samme regel som for Plus-breve i dag.
7. **Essential kræver c/o.** Adressen vises og printes med "c/o Flexum Coworking".
8. **Executive med holding.** Holdingselskabet oprettes som egen lejer med "faktureres via" drift-lejeren. Dermed går gebyrerne til den samme betaler, som det allerede virker i dag.
9. **Zoho.** "Løsning kort" genkender Essential, Professional og Executive.
10. **Farver og badges** til de nye løsninger i lejerlister og tabeller.

## Tekniske detaljer

- Data: indsæt 3 rækker i `tenant_types` og `pricing_settings`-rækker pr. løsning (mail/package, forklaring).
- Ny central hjælper i `src/lib/mailActions.ts`: `TIER_RULES[tier] = { freeDays: [1,4] | [1..5] | [4], portoIncluded, extraFee, packageFee, requiresCo }`. Den erstatter hårdkodede `"Lite"/"Standard"/"Plus"`-tjek i `TenantDashboard`, `OperatorDashboard`, `ShippingPrepPage`, `RegisterMailDialog`, `EnvelopePrint`, `PricingOverview`, `PricingSettingsEditor`, `TenantsPage`, `mailRowColor`. `actionValue`/`priceFor` udvides.
- Edge-funktioner: samme regeltabel i `_shared/officernd.ts`, brugt af `sync-officernd-charge` og `sync-officernd-charge-batch`, plus mapping i `zoho-crm-webhook`. Deployes efterfølgende.
- Migration: `apply_tenant_default_action` behandler Essential som Standard-lignende `send`. Executive og Professional får `send`. Scanning bliver `standard_scan` undtagen hos Executive, hvor den er gratis og øjeblikkelig som Plus.
- Test: lejer-visning pr. løsning, portoblokering i "Send breve og pakker" og en tørkørsel af gebyrberegningen.
