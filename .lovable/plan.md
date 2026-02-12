

## Auto-OCR ved markering + afsender-markering

### Problem
1. Der er ingen knap til at markere afsender - `cropTarget` understotter kun `"tenant"` og `"stamp"`
2. Efter markering skal man trykke "Aflæs markering" - OCR boer starte automatisk naar markeringen er faerdig

### Loesning

**`src/components/RegisterMailDialog.tsx`** - tre aendringer:

**1. Tilfoej "sender" som cropTarget**
- Aendr type fra `"tenant" | "stamp" | null` til `"tenant" | "stamp" | "sender" | null` (linje 69)
- Tilfoej en "Marker afsender" knap i crop-kontrollerne (linje 546-569), ved siden af de eksisterende knapper

**2. Auto-start OCR naar markering er faerdig**
- I `handleCropMouseUp` (linje 337-339): naar musen slippes og der er en gyldig cropRect (bredde/hoejde > 10px), kald `handleCropOcr` automatisk
- Fjern den manuelle "Aflæs markering"-knap fra crop-mode UI (linje 571-596) og vis i stedet kun "Annuller" + en loading-indikator

**3. Haandter sender-resultat i handleCropOcr**
- I handleCropOcr (linje 279-308): tilfoej en `else if (cropTarget === "sender")` gren der saetter `setSenderName(ocrText)` med den aflaeste tekst
- Opdater hint-teksten (linje 528) til ogsaa at vise "Tegn en boks omkring afsenderen" for sender-target

### Resultat
- Tre markeringsknapper: "Marker navn" (lejer), "Marker afsender", "Marker forsendelsesnr."
- OCR starter automatisk saa snart markeringen tegnes faerdig (mouseup)
- Ingen ekstra klik noedvendigt

