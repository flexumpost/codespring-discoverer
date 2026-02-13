

## Tilføj søgefelt over tabellen

Indsætter et søgefelt til højre for overskriften "Alle forsendelser" (eller det aktive filter-navn), som filtrerer forsendelserne på lejernavn og forsendelsesnummer.

### Ændringer i `src/pages/OperatorDashboard.tsx`

1. **Ny state-variabel**: `searchQuery` (string) til at holde søgeteksten
2. **Importér** `Input` fra `@/components/ui/input` og `Search` fra `lucide-react`
3. **Udvid linje 174-175** fra:
   ```text
   <h3 className="text-lg font-semibold mb-3">{selectedCard ?? "Alle forsendelser"}</h3>
   ```
   til en flex-row med overskriften til venstre og et søgefelt til højre
4. **Filtreringslogik**: Efter card-filteret og før sorteringen tilføjes en ekstra filtrering, der matcher `searchQuery` mod `tenants.company_name` og `stamp_number` (konverteret til string). Søgningen er case-insensitive og delvis (contains-match).

### Tekniske detaljer

| Sted | Ændring |
|------|---------|
| State | Tilføj `const [searchQuery, setSearchQuery] = useState("")` |
| Import | Tilføj `Input` og `Search` ikon |
| Filtrering (linje ~130) | `filteredItems` filtreres yderligere med `searchQuery` mod `company_name` og `stamp_number` |
| UI (linje ~174-175) | Erstat `<h3>` med flex-container: overskrift + søgefelt med Search-ikon |

Kun 1 fil ændres. Søgningen sker rent client-side på de allerede hentede data.

