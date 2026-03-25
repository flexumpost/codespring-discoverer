

## Analyse og plan

### Problem 1: Afhentet forsendelse er grå, skal være grøn
Når en forsendelse afhentes, sættes `chosen_action = "afhentet"` og `status = "arkiveret"`. I den nuværende logik fanges dette af regel 1 (linje 33): `arkiveret && chosen_action !== "destruer"` → **grå**. Ifølge det nye farveskema skal afhentede forsendelser være **grønne** (gennemført handling).

### Problem 2: Scanning-farver er ens for ulæst og læst
Aktuelt giver linje 43-44 **samme** grønne farve (`bg-green-200`) til både scannede-men-ulæste (`scan_url` sat) og læste (`status === "laest"`). Ifølge det nye skema skal:
- **Ulæst scanning** (har `scan_url`, status IKKE `laest`) → **lysgrøn** (`bg-green-100`)
- **Læst scanning** (`status === "laest"`) → **standard grøn** (`bg-green-200`)

### Ændringer

**File: `src/lib/mailRowColor.ts`**

1. **Tilføj ny regel før arkiveret-reglen** (før linje 33): Fang `chosen_action === "afhentet" && status === "arkiveret"` → `bg-green-200` (grøn).

2. **Opdel scanning-reglen** (linje 42-45) i to:
   - `status === "laest"` → `bg-green-200` (standard grøn — læst)
   - `scan_url && status !== "laest"` → `bg-green-100` (lysgrøn — scannet men ulæst)

Prioritetsrækkefølge efter ændring:
```text
sendt_med_dao/postnord → grøn
sendt_retur            → orange
afhentet + arkiveret   → grøn       ← NY
arkiveret (ikke destruer/afhentet) → grå
destruer               → rød
læst                   → grøn (standard)
scannet (ulæst)        → lysgrøn    ← ÆNDRET
under_forsendelse      → grøn
bestilt scanning       → blå
bestilt forsendelse    → peach
bestilt afhentning     → pink
ikke tildelt           → gul
ny/afventer            → gul
```

