

## Skift farve fra #6ec1e4 til #00aaeb

Erstatter alle forekomster af `#6ec1e4` med `#00aaeb` og justerer den tilhørende tekstfarve for bedre visuelt match.

### Kontrastanalyse

| Kontekst | Baggrund | Tekst | Kontrast |
|----------|----------|-------|----------|
| Plus-badge (lys) | #00aaeb ved 20% opacity (meget lys blå) | #006d9e (mørk blå) | God (ca. 5:1) |
| Tabel-række (lys) | #00aaeb ved 30% opacity | Standard foreground (mørk) | God |
| Tabel-række (mørk) | #00aaeb ved 20% opacity | Standard foreground (lys) | God |

Ingen kontrastproblemer identificeret. Farven er mere mættet men bruges altid med lav opacity, så baggrundene forbliver lyse nok.

### Ændringer

| Fil | Ændring |
|-----|---------|
| `src/lib/mailRowColor.ts` | Erstat `#6ec1e4` med `#00aaeb` i rækkefarverne |
| `src/pages/SettingsPage.tsx` | Erstat `#6ec1e4` med `#00aaeb` og tekstfarve `#2a7fa3` med `#006d9e` i Plus-badge |
| `src/components/RegisterMailDialog.tsx` | Samme badge-opdatering som SettingsPage |

3 filer, ren find-and-replace med farvejustering.

