# Fix: OCR-matching foreslår "test" i stedet for korrekt lejer

## Problem
For forsendelse 3543 læste OCR korrekt: modtager = "SKATTESTYRELSEN", afsender = "AQWA APS". Men systemet foreslog lejeren **"test"** i stedet for **AQWA APS**, fordi `fuzzyMatchTenant` finder delstrengen "test" inde i "ska**ttest**yrelsen" og returnerer den før swap-logikken når at prøve afsenderen.

## Årsag
`fuzzyMatchTenant` (findes både i `src/components/RegisterMailDialog.tsx` og `src/pages/BulkUploadPage.tsx`) laver naiv `includes`-substring-match uden længdekrav og uden score. Ethvert lejernavn på 3–4 tegn ("test", "EVT", etc.) rammer stort set alle OCR-strenge.

## Løsning

**1. Skærp `fuzzyMatchTenant` — samme regler begge steder:**
- Kræv minimum længde på det korteste navn i en substring-sammenligning (fx ≥ 5 tegn), så "test" ikke længere matcher tilfældige ord.
- Kræv at delstrengsmatch sker på **ordgrænser** (regex `\b`) frem for midt inde i et andet ord — "test" i "skattestyrelsen" udelukkes; "AQWA" i "AQWA APS" beholdes.
- Returner match sammen med en score (eksakt > ordgrænse-inklusion > kontakt-navn), så bedste kandidat kan vælges.

**2. Vælg bedste kombination i kalderen:**
- Hent match for både `recipientName` og `senderName` med score.
- Vælg den kandidat med højeste score; ved uafgjort foretræk modtager.
- Bevar swap-adfærd: hvis det valgte match kom fra `sender_name`-feltet, byttes felterne i UI'en, så lejeren står som modtager og modparten som afsender.

**3. Ingen ændringer i edge-function `ocr-stamp`** — OCR-aflæsningen selv var korrekt for 3543.

## Berørte filer
- `src/components/RegisterMailDialog.tsx` — skærp `fuzzyMatchTenant`, opdatér kalder-logik omkring linje 220–235.
- `src/pages/BulkUploadPage.tsx` — samme ændring i lokal `fuzzyMatchTenant` og swap-blok.

## Teknisk detalje
Ny matcher pseudo-kode:
```
score:
  4  exact company_name
  3  exact contact full name
  2  company_name matches on \b-boundary AND min(len)≥5
  1  contact name matches on \b-boundary AND min(len)≥5
  0  no match
```
Kalder tager `Math.max(recipientScore, senderScore)`; hvis begge 0 → ingen forslag; hvis sender vinder → swap.

## Verifikation
- Manuelt test-case: modtager="SKATTESTYRELSEN", afsender="AQWA APS" → foreslår AQWA APS (swap).
- Modtager="AQWA APS", afsender="PostNord" → foreslår AQWA APS uden swap.
- Modtager="test lejer", afsender="Danske Bank" → foreslår "test lejer" (eksakt, uændret).
