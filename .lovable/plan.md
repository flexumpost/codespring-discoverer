

## Intelligent validering af forsendelsesnummer via historik

### Problem
OCR-modellen aflaeser nogle gange et forkert nummer -- f.eks. en lang stregkode (28 cifre) i stedet for det korrekte forsendelsesnummer (4 cifre). De faktiske forsendelsesnumre i systemet er korte, fortloebende numre (2778, 2789, 2791, 2792).

### Loesning
Hent de seneste forsendelsesnumre fra databasen og brug dem til at validere OCR-resultatet. Hvis det aflaeeste nummer afviger markant i laengde eller vaerdi fra de kendte numre, forkastes det.

Valideringslogik:

```text
1. Hent seneste 20 forsendelsesnumre fra mail_items (sorteret efter created_at desc)
2. Beregn median-laengden af de kendte numre
3. Naar OCR returnerer et stamp_number:
   a. Hvis nummeret har mere end 2x median-laengden -> forkast (sandsynligvis stregkode)
   b. Hvis numre er numeriske og fortloebende: tjek om OCR-nummeret ligger
      inden for et rimeligt interval (seneste nummer +/- 1000)
   c. Hvis validering fejler: vis besked "Aflæst nummer virker usandsynligt - kontrollér venligst"
      og udfyld IKKE feltet automatisk
```

### Filer der aendres

**1. `src/components/RegisterMailDialog.tsx`**
- Tilfoej en `useEffect` eller query der henter de seneste stamp_numbers fra databasen ved komponent-load
- Efter OCR returnerer `stamp_number`: valider mod historikken foer auto-udfyldning
- Hvis nummeret fejler valideringen: vis en advarsel i stedet for at indsaette det

**2. `src/pages/BulkUploadPage.tsx`**
- Samme validering i bulk upload flowet
- Hent seneste stamp_numbers een gang naar siden loader
- Valider hvert OCR-resultat foer det indsaettes i review-tabellen

**3. Ny hjælpefunktion (kan placeres i en delt fil eller inline begge steder)**

```text
function validateStampNumber(
  ocrNumber: string,
  recentNumbers: number[]
): { valid: boolean; reason?: string } {
  if (recentNumbers.length === 0) return { valid: true };

  // Beregn typisk laengde
  const lengths = recentNumbers.map(n => String(n).length);
  const medianLength = lengths.sort()[Math.floor(lengths.length / 2)];

  // Forkast hvis mere end dobbelt saa langt
  if (ocrNumber.length > medianLength * 2) {
    return { valid: false, reason: "Nummer er for langt - muligvis stregkode" };
  }

  // Tjek om det er taet paa seneste numre (fortloebende sekvens)
  const num = parseInt(ocrNumber, 10);
  if (!isNaN(num)) {
    const maxRecent = Math.max(...recentNumbers);
    const minRecent = Math.min(...recentNumbers);
    if (num > maxRecent + 1000 || num < minRecent - 1000) {
      return { valid: false, reason: "Nummer ligger langt fra kendte forsendelsesnumre" };
    }
  }

  return { valid: true };
}
```

### Brugeroplevelse
- Gyldigt nummer: auto-udfyldes som i dag med groenn toast
- Ugyldigt nummer: feltet forbliver tomt, og en gul advarsel vises: "Aflæst nr. [X] virker usandsynligt - kontrollér venligst"
- Operatoeren kan altid manuelt indtaste det korrekte nummer

### Ingen database-aendringer
Kun en SELECT-query mod eksisterende data. Ingen nye tabeller eller kolonner.

