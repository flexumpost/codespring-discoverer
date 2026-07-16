## Mål

Når operatøren klikker på et filter-kort (fx "Åben og scan", "Send", "Afhentes", "Destrueres", "Læg på kontoret"), skal listen sorteres efter **hvornår forsendelsen skal behandles** – tidligste behandlingsdato øverst – i stedet for `stamp_number` desc.

Når intet kort er valgt (fuld liste), beholdes nuværende sortering (`stamp_number` desc), så oversigten er uændret.

## Ændring (kun frontend)

**Fil:** `src/pages/OperatorDashboard.tsx`

1. Tilføj en hjælpefunktion `getProcessingDate(item): Date` der returnerer den dato posten skal behandles:
   - `chosen_action = "scan"` → i dag (ekstra scanning behandles med det samme).
   - `chosen_action = "standard_scan"` → `getShippingDate(tier, "brev")`.
   - `chosen_action = "send"` eller `"under_forsendelse"` → `getNextThursday()`.
   - `chosen_action = "standard_forsendelse"` → `getShippingDate(tier, mail_type)`.
   - `chosen_action = "afhentning"` + `pickup_date` → `pickup_date`.
   - `chosen_action = "gratis_afhentning"` → `getShippingDate("Lite", "brev")`.
   - `chosen_action = "destruer"` → i dag.
   - `chosen_action = "daglig"` → i dag.
   - Intet `chosen_action`: brug `default_mail_action`/`default_package_action` med samme mapping.
   - Fald tilbage til `received_at`, hvis intet af ovenstående passer.

2. Tilføj en "færdig-behandlet"-flag pr. række, så gennemførte poster sorteres nederst i det valgte kort:
   - `status ∈ (sendt_med_dao, sendt_med_postnord, sendt_retur, arkiveret)` → nederst.
   - Scan uploadet (`scan_url` sat) i "Åben og scan" → nederst.

3. Ret sorteringen (linje 542-546):
   - Hvis `selectedCard` er null → behold `stamp_number` desc.
   - Hvis `selectedCard` er valgt → sortér ascending på `getProcessingDate(item)` (`getTime()`), med færdig-behandlede nederst; tie-break på `stamp_number` desc.

Ingen ændringer i database, edge functions, count-tal på kortene eller andre filtre (`Ubehandlet`, mail-type radio, søgning). Kun rækkefølgen i tabellen skifter, når et kort er aktivt.
