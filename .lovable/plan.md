

## Print C4-kuverter fra "Send breve og pakker"

### Overblik

Tilføj mulighed for at vælge forsendelsesgrupper til print og generere C4-kuverter med Flexum-logo, returadresse, DAO-portokode og modtageradresse.

### Ændringer

**1. Kopiér uploadede assets til projektet**
- `user-uploads://Flexum_Coworking_logo_108x400_px_png.png` → `src/assets/flexum-logo-print.png`
- `user-uploads://DAO_porto_kode.png` → `src/assets/dao-porto.png`

**2. Ny komponent: `src/components/EnvelopePrint.tsx`**

Print-komponent der renderer C4-kuverter (229mm × 324mm) til print via `window.print()`:
- Øverst venstre: Flexum-logo + returadresse "Maglebjergvej 6, 2800 Kongens Lyngby, Danmark"
- Øverst højre: "P" (kun hvis land = Danmark OG lejertype = Plus) + DAO-portokode
- Center: Modtageradresse i formatet: Modtager, c/o, Adresse, [Landekode] - [Postnummer] [By], Stat, Land
- Bruger `@media print` CSS til at skjule alt andet og vise én kuvert per side
- Modtager grupperede data som props

**3. Opdater `src/pages/ShippingPrepPage.tsx`**

| Ændring | Detalje |
|---|---|
| Ny state `printCheckedGroups` | `Set<string>` til at tracke valgte grupper til print |
| Tjekboks per gruppe | Indsættes til venstre for hver gruppes card (grøn markering) |
| "Vælg alle" tjekboks | I toolbar-området ved siden af Send-knappen (blå markering) |
| "Print C4 kuvert" knap | I toolbar ved siden af Send-knappen (rød markering), åbner print-dialog |
| Print-logik | Samler valgte grupper, renderer `EnvelopePrint` i et skjult div, kalder `window.print()` |

### Print-layout (C4 kuvert)

```text
┌──────────────────────────────────────────┐
│ [FLEXUM LOGO]              P  [DAO QR]  │
│ Maglebjergvej 6,                         │
│ 2800 Kongens Lyngby,                     │
│ Danmark                                  │
│                                          │
│                                          │
│          [Modtager navn]                 │
│          [c/o navn]                      │
│          [Adresse]                       │
│          [DK] - [2800] [By]             │
│          [Stat]                          │
│          [Land]                          │
│                                          │
└──────────────────────────────────────────┘
```

"P" vises kun når `shippingCountry` = "Danmark"/"Denmark" OG mindst én tenant i gruppen har type "Plus".

### Filer

| Fil | Handling |
|---|---|
| `src/assets/flexum-logo-print.png` | Nyt asset (kopieret) |
| `src/assets/dao-porto.png` | Nyt asset (kopieret) |
| `src/components/EnvelopePrint.tsx` | Ny komponent — C4 kuvert-layout med print CSS |
| `src/pages/ShippingPrepPage.tsx` | Tilføj gruppe-tjekbokse, vælg-alle, print-knap |

