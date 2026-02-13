

## Tydeligere farver og groen status for scannede/laeste breve

### Aendringer

**`src/lib/mailRowColor.ts`** - Opdater farvefunktionen med to aendringer:

1. **Goer "Laest" groen**: AEndr linjen for `status === "laest"` saa den returnerer groen i stedet for tom streng. Paa lejer-siden betyder dette at scannede og laeeste breve ogsaa bliver groenne.

2. **Tilfoej check for scan_url**: Tilfoej en ny regel: Hvis `scan_url` er sat (uanset status), returner groen. Dette sikrer at operatoer-siden ogsaa ser groent naar de har uploadet en PDF.

3. **Goer alle farver kraeftigere**: Skift fra `-50` (meget lys/pastel) til `-200` for alle baggrunde. Mork tilstand skiftes fra `-950/30` til `-900/40`.

### Ny farveoversigt

| Stadie | Foer (pastel) | Efter (tydeligere) |
|--------|---------------|---------------------|
| Destruer | `bg-red-50` | `bg-red-200 dark:bg-red-900/40` |
| Ikke tildelt / Ny | `bg-yellow-50` | `bg-yellow-200 dark:bg-yellow-900/40` |
| Afventer scan | `bg-blue-50` | `bg-blue-200 dark:bg-blue-900/40` |
| Scannet (uleast + laest + har scan_url) | `bg-green-50` | `bg-green-200 dark:bg-green-900/40` |
| Send/Afhentning/Daglig | `bg-purple-50` | `bg-purple-200 dark:bg-purple-900/40` |
| Arkiveret | `bg-gray-50` | `bg-gray-200 dark:bg-gray-900/40` |

### Opdateret logik i `getMailRowColor`

```text
1. chosen_action === "destruer"        -> roed
2. !tenant_id                          -> gul
3. scan && !scan_url                   -> blaa
4. scan_url er sat (uploaded PDF)      -> groen  (NY - fanger baade ulaest og laest)
5. status === "arkiveret"              -> graa
6. send/afhentning/daglig              -> lilla
7. ny / afventer_handling              -> gul
```

Noegle-aendringen er at punkt 4 nu fanger alle breve med en uploadet scan (baade ulaeeste og laeeste), og at farverne er markant kraeftigere.

### Filer der aendres

| Fil | AEndring |
|-----|---------|
| `src/lib/mailRowColor.ts` | Opdater alle farver fra -50 til -200, tilfoej scan_url-regel, goer laest groen |

Ingen andre filer aendres - begge dashboards bruger allerede `getMailRowColor`.
