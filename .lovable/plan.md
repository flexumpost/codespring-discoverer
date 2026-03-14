

## Nye templates + nyt layout med rich text editor

### 1. Seed 6 nye templates i databasen

Brug insert-tool (ikke migration) til at indsætte:

**Lejer-templates:**
- `shipment_dispatched` — "Forsendelse afsendt"
- `destruction_confirmed` — "Destruering bekræftet"
- `missing_address` — "Manglende forsendelsesadresse"
- `action_required` — "Handling påkrævet"

**Operatør-templates:**
- `address_updated` — "Forsendelsesadresse opdateret"
- `daily_report` — "Daglig rapport"

Opdater `SLUG_LABELS` i koden med de nye slugs.

### 2. Nyt layout: sidebar + editor

Erstat det nuværende card-baserede layout med et to-kolonne layout:

```text
┌──────────────┬─────────────────────────────────┐
│  Sidebar     │  Valgt template                 │
│              │                                 │
│  Lejer       │  Emne: [________________]       │
│  · Velkomst  │                                 │
│  · Ny fors.  │  ┌─────────────────────────┐    │
│  · ...       │  │  Rich text editor       │    │
│              │  │  (TipTap)               │    │
│  Operatør    │  │                         │    │
│  · Ny anm.   │  │                         │    │
│  · ...       │  └─────────────────────────┘    │
│              │                                 │
│              │  [Gem] [Annuller]               │
└──────────────┴─────────────────────────────────┘
```

- Venstre: smal kolonne (~250px) med grupperede template-navne (lejer/operatør)
- Højre: bred kolonne med emne-felt + rich text editor + gem/annuller

### 3. Rich text editor: TipTap

Tilføj `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image` som dependencies.

TipTap er gratis, React-native, og understøtter:
- Bold, italic, headings, lister
- Billedindsættelse via URL
- HTML output (gemmes i `body`-feltet)

En simpel toolbar med knapper for formatering og billede-indsættelse.

### Filer

| Fil | Handling |
|---|---|
| `email_templates` data | Insert 6 nye rækker |
| `src/components/EmailTemplatesEditor.tsx` | Omskriv med sidebar + TipTap editor |

