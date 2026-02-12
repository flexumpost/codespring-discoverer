

## Tilfoej drag-to-select OCR for forsendelsesnr.

### Oversigt
Udvid den eksisterende crop-funktionalitet saa operatoeren ogsaa kan tegne en boks omkring forsendelsesnummeret paa billedet. Lige nu bruges crop-mode kun til at aflaese modtagernavnet. Vi tilføjer en tilsvarende knap og logik for forsendelsesnr.

### Aendringer i `src/components/RegisterMailDialog.tsx`

**1. Ny state: `cropTarget`**
- Tilfoej en state-variabel `cropTarget: "tenant" | "stamp" | null` der angiver hvad crop-markeringen skal bruges til.
- Erstat den nuvaerende `cropMode`-boolean med denne (eller lad `cropMode` vaere `cropTarget !== null`).

**2. Opdater `handleCropOcr`**
- Naar `cropTarget === "stamp"`: den aflaeste tekst (efter fjernelse af ikke-cifre) saettes som `stampNumber`.
- Naar `cropTarget === "tenant"`: eksisterende logik bevares (fuzzy match mod lejerlisten).

**3. Tilfoej knap til forsendelsesnr.-crop**
- Vis en "Marker forsendelsesnr. paa billedet" knap naar:
  - Der er et foto-preview
  - OCR ikke fandt et forsendelsesnr. automatisk (eller brugeren vil rette det)
- Knappen aktiverer crop-mode med `cropTarget = "stamp"`

**4. Opdater crop-overlay hint-tekst**
- Naar `cropTarget === "stamp"`: "Tegn en boks omkring forsendelsesnr."
- Naar `cropTarget === "tenant"`: "Tegn en boks omkring navnet" (som nu)

### Tekniske detaljer

- Ingen aendringer i edge function -- `crop_base64` returnerer allerede raa tekst via `ocr_text`
- Kun frontend-aendringer i `RegisterMailDialog.tsx`
- `cropTarget` erstatter `cropMode` som primaer state-styring:
  - `cropMode` kan beregnes: `const cropMode = cropTarget !== null`
  - Eller vi beholder `cropMode` og tilfojer `cropTarget` separat

**Fil der aendres:**
- `src/components/RegisterMailDialog.tsx`
