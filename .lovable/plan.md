## Kontrol af omkostningsoverførsel: Erik Villiam Thomsen K/S → Management Company K/S

### Hvad jeg har tjekket i databasen

**Lejer-opsætning:**
- `ERIK VILLIAM THOMSEN K/S` — tier: **Plus**, `billed_by_email = lundeager25@gmail.com`
- `Management Company K/S` — tier: **Plus**, `contact_email = lundeager25@gmail.com`

Routingen er altså korrekt sat op: når Erik Villiam Thomsen K/S har en omkostning, slår batch-sync `lundeager25@gmail.com` op i OfficeRnD, finder medlemmet (som hører til Management Company K/S' team), og opretter gebyret på Management Company K/S' team — ikke på Erik Villiam Thomsen K/S.

### Det konkrete brev (stempel 3410)

- `mail_type = brev`, `chosen_action = under_forsendelse`, `porto_option = NULL`
- Sync-log: `skipped_zero_fee` (0 kr.)

Det er **korrekt og forventet** — ikke en fejl:

1. **Hovedgebyr:** Plus-lejere har 0 kr. på brev-forsendelse → intet at fakturere.
2. **Porto:** Plus-lejere er undtaget porto-opkrævning i `sync-officernd-charge-batch` (linje: `if (!isPackagePorto && it.tier_name === "Plus") continue;`). Plus inkluderer porto i abonnementet.

Så der er **ingen omkostning at overføre** for dette brev — hverken til Erik Villiam Thomsen K/S eller til Management Company K/S.

### Hvis fremtidige Erik Villiam Thomsen-forsendelser får et gebyr

Eksempel: en pakke, eller hvis tier ændres fra Plus til Standard/Lite. Da `billed_by_email` peger på Management Company K/S' kontakt, vil:

- Hoved-gebyret blive oprettet på Management Company K/S' team i OfficeRnD
- Porto (hvis relevant, dvs. ikke-Plus brev eller pakke-porto) ligeledes blive lagt på Management Company K/S' team

Beskrivelsen på gebyret vil indeholde `(ERIK VILLIAM THOMSEN K/S)` så det er sporbart hvilken lejer omkostningen reelt vedrører.

### Forslag

**Ingen kodeændring nødvendig.** Opsætningen er korrekt og fungerer som tilsigtet. Hvis du vil, kan jeg i stedet:

- **A)** Bare bekræfte ovenstående (ingen ændringer) — vi går videre med Part 2 (UI-validering af porto + edge function-fix) når du sender porto-koderne for de 6 breve.
- **B)** Tilføje en lille verifikation i OfficeRnD ved at sende en test-opslagning på `lundeager25@gmail.com` og rapportere hvilket team/company medlemmet hører til, så vi er 100 % sikre på at OfficeRnD-siden også er korrekt opsat.

Hvilken vil du have?
