## Tilføjelse af nye porto-muligheder for breve (DK)

### Baggrund
Operatøren har i dag kun to porto-muligheder for brevforsendelser indenfor Danmark (DK) til Lite og Standard-lejere:
- DK (0–100 g.) kr. 18,40
- DK (100–250 g.) kr. 36,80

Der skal tilføjes to nye vægt-intervaller:
- DK (250–500 g.) kr. 54,00
- DK (500–1500 g.) kr. 72,00

### Ændringer

1. **Frontend UI – `src/pages/ShippingPrepPage.tsx`**
   - I brev-forsendelses-dropdown (grupperet visning) tilføjes to nye `<SelectItem>`-rækker under `isDk`-grenen.
   - Nye værdier: `dk_250_500` og `dk_500_1500`.

2. **Backend – `supabase/functions/sync-officernd-charge/index.ts`**
   - Udvid `PORTO_MAP` med de to nye poster, så OfficeRnD-synkroniseringen kender prisen og plan-navnet.
   - Plan-navne følger eksisterende mønster: "DAO Porto Danmark (250 - 500 g.) kr. 54" og "DAO Porto Danmark (500 - 1500 g.) kr. 72".

### Ingen database-migration nødvendig
`porto_option`-kolonnen i `mail_items` er af typen `text` og ikke en enum, så nye værdier kan gemmes uden skema-ændring.

### Tekniske detaljer
- `dk_250_500`: `amountKr: 54.00`, planName: `'DAO Porto Danmark (250 - 500 g.) kr. 54'`
- `dk_500_1500`: `amountKr: 72.00`, planName: `'DAO Porto Danmark (500 - 1500 g.) kr. 72'`

Efter kode-ændringer deployes `sync-officernd-charge` Edge Function igen.