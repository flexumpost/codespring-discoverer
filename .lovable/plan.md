

## Udvid OCR til at aflaese afsender (tekst og logo-genkendelse)

### Oversigt
OCR-funktionen udvides til ogsaa at identificere afsenderen paa forsendelser -- baade via tekst og logo-genkendelse. Resultatet vises i dashboardet og i bulk upload.

Databasen har allerede kolonnen `sender_name` paa `mail_items`, saa der kraeves ingen database-aendringer.

### Aendringer

**1. `supabase/functions/ocr-stamp/index.ts`**
- Udvid tool-calling skemaet med et nyt felt `sender_name` (afsenderens navn, firma eller logo-tekst)
- Opdater system-prompten til at bede modellen om ogsaa at identificere afsenderen -- baade som trykt tekst og som genkendt logo (f.eks. PostNord, DHL, GLS, DPD)
- Returner `sender_name` sammen med `stamp_number` og `recipient_name`

Prompt-tilfoejelse:
```text
Find ogsaa afsenderens navn eller firma. Hvis der er et logo (f.eks. PostNord, DHL, GLS),
returner logoets firmanavn. Returner tom streng hvis ikke fundet.
```

Tool-skema udvides med:
```text
sender_name: {
  type: "string",
  description: "Afsenderens navn eller firmanavn (inkl. logo-genkendelse). Tom streng hvis ikke fundet."
}
```

**2. `src/components/RegisterMailDialog.tsx`**
- Naar OCR returnerer `sender_name`, prae-udfyld `senderName`-feltet automatisk
- Vis en toast ved succes: "Afsender fundet: [navn]"

**3. `src/components/BulkMailReviewTable.tsx`**
- Tilfoej en ny kolonne "Afsender" med et redigerbart input-felt

**4. `src/pages/BulkUploadPage.tsx`**
- Udvid `BulkItem`-typen med `senderName: string`
- Gem OCR-resultatet for `sender_name` i itemet
- Ved gem: indsaet `sender_name` i `mail_items`-inserten

**5. `src/pages/OperatorDashboard.tsx`**
- Tilfoej en kolonne "Afsender" i tabellen, der viser `item.sender_name`

### Teknisk detalje

Ingen database-migration noeodvendig -- `sender_name` (text, nullable) findes allerede paa `mail_items`.

Gemini Flash er multimodal og kan baade laese tekst og genkende velkendte logoer (PostNord, DHL, GLS, DPD, FedEx osv.) direkte fra billedet. Der tilfoeejes ingen ny model eller API -- kun prompten udvides.

**Filer der aendres:**
- `supabase/functions/ocr-stamp/index.ts` (udvid prompt og tool-skema)
- `src/components/RegisterMailDialog.tsx` (prae-udfyld afsender)
- `src/components/BulkMailReviewTable.tsx` (ny kolonne)
- `src/pages/BulkUploadPage.tsx` (udvid BulkItem + gem sender_name)
- `src/pages/OperatorDashboard.tsx` (ny kolonne i tabel)

