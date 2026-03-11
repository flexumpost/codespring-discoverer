

## Ændringer til "Send breve og pakker"-siden

### Hvad ændres

1. **Checkbox forbliver checket** — items forsvinder ikke fra listen ved afkrydsning, men gemmes lokalt i state (`checkedIds` set)
2. **"Færdig"-knap per firma-kort** — når klikket: kortet bliver gråt og flyttes nederst i listen (lokalt state `doneGroups` set)
3. **"Send"-knap over listen** — når klikket: alle checkede items opdateres i databasen med `chosen_action = 'under_forsendelse'` men status forbliver uændret (ikke arkiveret)
4. **Status ændring**: `chosen_action` sættes til `under_forsendelse`, men `status` ændres IKKE til `arkiveret` — posten forbliver aktiv men låst for lejeren

### Ændringer i `src/pages/ShippingPrepPage.tsx`

| Element | Ændring |
|---|---|
| State | Tilføj `checkedIds: Set<string>` og `doneGroups: Set<string>` (tenant_id-baseret) |
| Checkbox | Fjern mutation ved check — toggle kun i `checkedIds` |
| "Færdig"-knap | Vises i hvert CardHeader, tilføjer tenant_id til `doneGroups` |
| Gruppering | Sorter: ikke-done grupper først, done grupper nederst. Done grupper får `opacity-50 bg-muted` |
| "Send"-knap | Over listen, klikker → bulk-opdaterer alle checkede items: `chosen_action = 'under_forsendelse'` (status uændret) |
| Query filter | Tilføj `chosen_action` filter: hent også items med `under_forsendelse` ikke, men ekskluder dem fra listen (eller juster efter behov) |

### UI-struktur

```text
┌──────────────────────────────────────────────┐
│ Send breve og pakker         [📅 dato]       │
│                                              │
│ [Breve] [Pakker]                             │
│                                              │
│ [Send]  ← knap over listen                  │
│                                              │
│ ▸ Firma ABC                      [Færdig]   │
│   ☑ Nr. 1234                                 │
│   ☐ Nr. 1235                                 │
│                                              │
│ ▸ Firma XYZ (grå, nederst)      [Færdig ✓]  │
│   ☑ Nr. 1240                                 │
└──────────────────────────────────────────────┘
```

