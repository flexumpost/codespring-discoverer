

## Justeringer til C4 kuvert-print layout

### Ændringer i `src/components/EnvelopePrint.tsx`

| Justering | Detalje |
|---|---|
| Afsenderadresse på én linje | Erstat 3 `<div>` med én: `Maglebjergvej 6, 2800 Kongens Lyngby, Danmark` |
| Logo bredde matcher tekst | Brug `width` i stedet for `height` på logo, ca. 55mm for at matche tekstlængden |
| Mindre margin/padding | Reducer padding fra `15mm 20mm` til `8mm 15mm` for at flytte alt højere op |
| DAO porto længere til højre | Fjern `justifyContent: space-between`, brug margin-left auto + fjern gap, eller tilføj `marginRight: 0` |
| "P" centreret vertikalt ud for DAO | Ændr `alignItems` til `center` på DAO-containeren |
| Større modtagertekst | Øg fontSize fra `14pt` til `18pt` |

