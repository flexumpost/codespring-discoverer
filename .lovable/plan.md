

# Automatisk stempelnummer via OCR paa foto

## Overblik
Naar operatoeren tager eller uploader et foto af en forsendelse, sendes billedet automatisk til en AI-model (Gemini Flash med billedgenkendelse) som laeser forsendelsesnummeret fra billedet og udfylder feltet automatisk.

## Hvordan det virker for brugeren
1. Operatoer tager billede eller uploader foto af forsendelsen
2. En "Laeser nummer..."-indikator vises ved forsendelsesnr.-feltet
3. Nummeret udfyldes automatisk naar OCR er faerdigt
4. Operatoer kan altid rette nummeret manuelt

## Teknisk implementering

### 1. Ny backend-funktion: `supabase/functions/ocr-stamp/index.ts`
- Modtager base64-kodet billede fra klienten
- Sender billedet til Lovable AI Gateway med `google/gemini-2.5-flash` (multimodal)
- System-prompt beder modellen om KUN at returnere forsendelsesnummeret (tal) fra billedet
- Returnerer det fundne nummer som JSON `{ stamp_number: "12345" }` eller `{ stamp_number: null }` hvis intet findes

### 2. Opdatering af `src/components/RegisterMailDialog.tsx`
- Ny state: `ocrLoading` (boolean) for loading-indikator
- Ny funktion `runOcr(file: File)`:
  - Konverterer filen til base64
  - Kalder edge-funktionen `/functions/v1/ocr-stamp`
  - Hvis et nummer returneres og feltet er tomt, udfyldes `stampNumber` automatisk
  - Viser toast ved fejl
- Kald `runOcr()` automatisk efter:
  - `handlePhotoChange` (fil-upload)
  - `capturePhoto` (kamera)
- Vis spinner/tekst "Laeser nummer..." ved forsendelsesnr.-feltet mens OCR koerer

### 3. Konfiguration
- Opdater `supabase/config.toml` med den nye funktion (verify_jwt = false for simpelhed, da den kun bruges internt)
- LOVABLE_API_KEY er allerede tilgaengelig som secret

