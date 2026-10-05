# Plus-breve sendes mandag og torsdag

Brevene står til torsdag den 8. oktober, fordi Plus stadig følger den gamle regel om afsendelse kun om torsdagen. Kun Standard, Professional og Executive er sat op til mandag og torsdag. Breve sendes mandag og torsdag, så Plus skal følge samme regel.

## Ændring
- Plus kommer med på listen over løsninger, der har mandag og torsdag som faste dage.
- Brev 3956 og 3942 står derefter til "Skal sendes i dag" (mandag den 5. oktober) og kommer med under "Send breve og pakker" i dag.
- Lejerens egen oversigt viser samme dato.
- Scanning og afhentning er i forvejen gratis alle dage for Plus, så det ændrer sig ikke. Pakker sendes stadig løbende.

## Teknisk
- Tilføj "Plus" i `MON_THU_TIERS` i `src/lib/tiers.ts` og i `hasMondayAndThursday` i `supabase/functions/_shared/tiers.ts`. Opdater kommentaren øverst i filen.
- Gendeploy `sync-officernd-charge` og `sync-officernd-charge-batch`, som bruger den fælles regel. Plus scanner og afhenter i forvejen til 0 kr., så gebyrerne ændrer sig ikke.
- Ingen ændring i databasen.
