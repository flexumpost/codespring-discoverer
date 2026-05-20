## Mål

Når et gebyr overføres til OfficeRnD, skal forsendelsesnummer (stamp number) og dato fremgå af gebyrets navn — ikke kun i beskrivelsen.

Eksempel før: `Brev/pakke afhentning (Lite)`
Eksempel efter: `Brev/pakke afhentning (Lite) (1234) - 20-05-26`

## Ændringer

Opdater `chargeBody.name` (det felt OfficeRnD viser) i begge sync-funktioner, så det inkluderer `(stamp_number)` og ` - dd-mm-yy`. Beskrivelses-feltet (med `[mail_item_id:...]` markører som webhook'en bruger til matching) forbliver uændret.

### 1. `supabase/functions/sync-officernd-charge/index.ts` (enkelt-item)

- Beregn `stampLabel = item.stamp_number ? ` (${item.stamp_number})` : ""`
- Beregn `dateLabel = format(now, "dd-MM-yy")` (manuel formatering, ingen ekstra deps)
- Hovedgebyr (linje ~314): `chargeBody.name = `${planName}${stampLabel} - ${dateLabel}``
- Fallback custom fee (linje ~318): tilsvarende suffix
- Porto-gebyr (linje ~390/392): `portoBody.name = `${portoInfo.planName}${stampLabel} - ${dateLabel}``

### 2. `supabase/functions/sync-officernd-charge-batch/index.ts` (batch)

- Hovedgebyr (linje ~347–349): brug eksisterende `stampText` (allerede ` (nr. 1, 2, 3)`) men i kortere form `(1, 2, 3)` uden "nr." og append dato:
  `chargeBody.name = `${planName}${stampLabelShort} - ${dateLabel}``
- Porto-gebyr (linje ~484/486): tilsvarende med `(nr.)`-stamps fra `chargeItems` og dato.

### Dato-format

`dd-MM-yy` baseret på `new Date()` (samme tidspunkt som `chargeBody.date`). Implementeres med `String(...).padStart(2,'0')` — ingen biblioteker.

## Teknisk note

- Webhook'en (`officernd-webhook`) matcher på `charge_id`, `mail_item_id` i description, eller `member_id` — den læser ikke `name`, så navngivnings-ændringen er sikker.
- Idempotency-tjek (`officernd_sync_log`) påvirkes ikke.
- Ingen DB-ændringer.
