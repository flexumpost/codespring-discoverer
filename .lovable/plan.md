

## Udvid OCR til modtagernavn + drag-to-select fallback

### Oversigt
Naar et billede tages/uploades, sender vi det til en udvidet OCR-funktion der baade finder forsendelsesnr. OG modtagernavnet. Hvis modtageren matcher en lejer, udfyldes lejerfeltet automatisk. Hvis ikke, faar operatoeren mulighed for at tegne en boks omkring navnet paa forsendelsen, hvorefter et udsnit sendes til OCR for at laese teksten.

### Trin

**1. Udvid edge function `ocr-stamp` til ogsaa at returnere modtagernavn**
- Opdater system-prompten saa AI returnerer baade forsendelsesnr. og modtagernavn
- Brug tool calling (structured output) til at faa et JSON-objekt med `stamp_number` og `recipient_name`
- Returner begge felter i response

**2. Opdater `RegisterMailDialog` -- automatisk lejer-match**
- Naar OCR returnerer `recipient_name`, soeg i lejer-listen (fuzzy match paa `company_name` og `contact_name`)
- Hvis match: saet lejeren automatisk og vis en toast
- Hvis ingen match: vis en besked "Kunne ikke matche modtager automatisk"

**3. Tilfoej drag-to-select boks paa billedet (fallback)**
- Naar der ikke findes et match, vis en knap "Marker navn paa billedet"
- Operatoeren tegner et rektangel (mousedown/mousemove/mouseup) paa foto-preview
- Udklippet sendes som nyt billede til en ny edge function `ocr-region` (eller genbrugt endpoint med et flag)
- OCR laesser teksten i regionen og forsoeges matchet mod lejerlisten
- Hvis match: udfyld lejer. Hvis ikke: udfyld soege-feltet med den aflaeste tekst

### Tekniske detaljer

**Edge function aendring (`ocr-stamp/index.ts`):**
- Ny system-prompt: "Find baade forsendelsesnummer og modtagernavn"
- Brug tool calling til structured output:
```
tools: [{
  type: "function",
  function: {
    name: "extract_mail_info",
    parameters: {
      type: "object",
      properties: {
        stamp_number: { type: "string", description: "Forsendelsesnummeret (kun cifre)" },
        recipient_name: { type: "string", description: "Modtagerens navn som staar paa forsendelsen" }
      }
    }
  }
}]
```
- Haandter ogsaa et nyt felt `crop_base64` -- hvis dette sendes, laes kun teksten i det beskaarede billede og returner som `ocr_text`

**Frontend aendringer (`RegisterMailDialog.tsx`):**
- Ny state: `ocrRecipient`, `showCropMode`, `cropRect`
- Efter OCR: match `recipient_name` mod `tenants` listen med case-insensitive includes
- Crop-mode: et canvas-overlay paa billedet hvor man tegner en boks
  - `onMouseDown` starter boksens position
  - `onMouseMove` opdaterer stoerrelse
  - `onMouseUp` afslutter og beskaeringer billedet via en skjult canvas
  - Det beskaerede billede sendes til `ocr-stamp` med `crop_base64` felt
  - Resultatet bruges til at udfylde eller soege i lejer-feltet

**Filer der aendres:**
- `supabase/functions/ocr-stamp/index.ts` -- udvidet prompt + crop-mode
- `src/components/RegisterMailDialog.tsx` -- auto-match + crop UI

