

## Fix: Velkomst-e-mail viser literal `\n\n` i stedet for linjeskift

### Problem
Skabelonens body-tekst i databasen indeholder escaped `\n`-tegn (bogstavelig tekst `\n`, ikke faktiske linjeskift). Den nuværende kode splitter kun på rigtige newline-tegn (`\n`), så de escaped versioner (`\\n`) vises som rå tekst i e-mailen.

### Løsning
Opdater `send-welcome-email/index.ts` til også at erstatte literal escaped `\n`-strenge med rigtige newlines, før teksten splittes til HTML-paragraffer.

| Fil | Ændring |
|---|---|
| `supabase/functions/send-welcome-email/index.ts` | Tilføj `.replace(/\\n/g, '\n')` før split-logikken |

Én linje ændring + redeploy.

