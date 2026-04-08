## Konsolidér gebyr per lejer + flyt porto-dropdown

### Problem

Når en lejer får tilsendt 3 breve på én gang, oprettes der i dag 3 separate gebyrer i OfficeRnD (ét per mail_item via DB-triggeren `notify_officernd_on_archive`). Der skal kun oprettes **ét samlet gebyr per lejer per forsendelse**.

### Forslag til løsning

**Tilgang: Batch-synkronisering fra frontend — spring trigger over for forsendelser**

1. **Ny edge function `sync-officernd-charge-batch**` som modtager et array af `mail_item_ids` og:
  - Grupperer items per tenant
  - For hver tenant: beregner ét samlet gebyr (summen af alle items' gebyrer) og opretter **ét** OfficeRnD-gebyr med `quantity` = antal items, eller samlet pris
  - Porto håndteres separat (én porto per item, da vægten kan variere)
2. **Marker items så triggeren springer dem over**: Tilføj et flag `skip_officernd_sync` (boolean) på `mail_items`, som sættes til `true` når items sendes via forsendelsessiden. Triggeren checker dette flag og springer over hvis `true`. Alternativt: fjern trigger-betingelsen for `sendt_med_dao`/`sendt_med_postnord` og lad forsendelsessiden altid kalde batch-funktionen eksplicit.
3. **Frontend (ShippingPrepPage)**: Ved klik på "Send" — kald `sync-officernd-charge-batch` med alle valgte item-IDs i stedet for at lade triggeren håndtere det.

### Porto-dropdown flyttes

**Nuværende placering**: På hver forsendelseslinje (per item).

**Ny placering**: Op i gruppe-headeren ved siden af "Færdig"-knappen. Da alle items i en gruppe deler samme adresse/lejer, giver det mening at vælge porto én gang per gruppe (for breve). For pakker beholdes porto per item, da pakkevægt varierer.

```text
┌──────────────────────────────────────────────────┐
│ Firma A [Lite]                                   │
│ Adresse...                                       │
│                    [Porto-dropdown ▾]  [✓ Færdig] │
│ ─────────────────────────────────────────────── │
│ ☐ Nr. 101 — Firma A — 0 kr. + porto             │
│ ☐ Nr. 102 — Firma A — 0 kr. + porto             │
│ ☐ Nr. 103 — Firma A — 0 kr. + porto             │
└──────────────────────────────────────────────────┘
```

### Berørte filer


| Fil                                                       | Ændring                                                                                                                                |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/functions/sync-officernd-charge-batch/index.ts` | Ny edge function: modtager array af item-IDs, grupperer per tenant, opretter ét gebyr per tenant                                       |
| `supabase/functions/sync-officernd-charge/index.ts`       | Ingen ændring — bruges stadig af trigger for scan/afhentning                                                                           |
| DB migration                                              | Enten tilføj `skip_officernd_sync` kolonne, eller opdater triggeren til at ekskludere `sendt_med_dao`/`sendt_med_postnord`             |
| `src/pages/ShippingPrepPage.tsx`                          | 1) Kald batch-funktionen ved send. 2) Flyt porto-dropdown fra item-linje til gruppe-header (for breve). Pakker beholder porto per item |


### Åbne spørgsmål

**Gebyr-konsolidering**: Skal gebyret vises som f.eks. "Brev forsendelse (Lite) x3" med `quantity: 3`? Eller som én samlet sum? Det afhænger af hvad der ser bedst ud i OfficeRnD.  
- Ja, tak, er det også muligt at tilføje forsendelsesnummer?

**Porto per gruppe vs. per item**: For breve vejer de typisk det samme, så én porto-dropdown per gruppe giver mening. For pakker varierer vægten, så porto bør forblive per item. Er det korrekt?  
- Ja, det er korrekt.