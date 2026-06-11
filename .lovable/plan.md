## Fix manglende porto-charge for nye DK-vægtklasser

### Årsag
De nye porto-værdier `dk_250_500` og `dk_500_1500` blev tilføjet til `sync-officernd-charge/index.ts`, men `sync-officernd-charge-batch/index.ts` — som shipping-siden faktisk kalder for `sendt_med_dao`/`sendt_med_postnord` — fik ikke samme opdatering. Når `PORTO_MAP[portoOption]` returnerer `undefined`, springes porto-beregningen over (`if (!portoInfo) continue;`), så lejeren ikke blev faktureret porto for PETITES POMPOMES APS (nr. 3384).

### Ændring
Udvid `PORTO_MAP` i `supabase/functions/sync-officernd-charge-batch/index.ts` med:
- `dk_250_500`: `'DAO Porto Danmark (250 - 500 g.) kr. 54'`, 54,00 kr.
- `dk_500_1500`: `'DAO Porto Danmark (500 - 1500 g.) kr. 72'`, 72,00 kr.

### Efterbehandling
For den ene allerede sendte forsendelse (nr. 3384) skal porto-charge oprettes manuelt i OfficeRnD, da batch-funktionen ikke kører igen for samme item. Alternativt kan jeg trigge en éngangs-opretttelse via en lille engangs-edge-function eller du opretter det direkte i OfficeRnD.