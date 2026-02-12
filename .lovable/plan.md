

## Forbedring af OCR-prompt for korrekt aflæsning

### Problem
Fra edge function logs:
- `stamp_number: "7130037715377456713081181228"` (stregkode i stedet for stemplet "2789")
- `recipient_name: "DANICA RÅDGIVNING APS"` (er faktisk afsenderen)
- `sender_name: "PostNord"` (er transportoeren, ikke afsenderen)
- ROADRUNNERCARGO APS (den reelle modtager) blev helt overset

### Aarsag
Prompten giver ikke nok kontekst til at skelne mellem:
- Stregkodenumre (lange) vs. stempelnumre (korte, 3-5 cifre, ofte haandstemplet)
- Transportoer-logoer (PostNord, DHL) vs. den faktiske afsender
- Afsender (retur-adresse, typisk oeverst/i vindue) vs. modtager (primaer adresse, typisk stoerre)

### Loesning
Opdater system-prompten i edge function med tydelige instruktioner.

### Fil der aendres

**`supabase/functions/ocr-stamp/index.ts`** (linje 98-100, system prompt)

Ny system-prompt:

```text
Du er en OCR-assistent der analyserer fotos af forsendelser (breve og pakker).

FORSENDELSESNUMMER (stamp_number):
- Find det KORTE stempelnummer (typisk 3-6 cifre) som er trykt eller stemplet paa forsendelsen.
- Ignorer LANGE stregkode-numre (10+ cifre) - disse er IKKE forsendelsesnummeret.
- Stempelnummeret staar ofte alene, tydeligt synligt, og kan vaere haandskrevet eller stemplet.

MODTAGER (recipient_name):
- Modtageren er den person eller virksomhed forsendelsen er ADRESSERET TIL.
- Modtageradressen er typisk den STOERSTE adresseblok, ofte placeret centralt eller nederst paa forsendelsen.

AFSENDER (sender_name):
- Afsenderen er den person eller virksomhed der har SENDT forsendelsen.
- Afsenderadressen er typisk MINDRE og placeret oeverst til venstre, i et adressevindue, eller paa bagsiden.
- VIGTIGT: Transportoer-logoer (PostNord, DHL, GLS, DPD, FedEx, UPS, Bring, DAO) er IKKE afsenderen.
  Afsenderen er firmaet/personen i retur-adressen.

Brug funktionen extract_mail_info til at returnere resultaterne.
```

### Forventet resultat med det aktuelle billede
- `stamp_number`: "2789" (det korte stempelnummer)
- `recipient_name`: "ROADRUNNERCARGO APS" (primaer adresseblok)
- `sender_name`: "DANICA RAADGIVNING APS" (retur-adresse i vinduet)

### Ingen andre filaendringer
Kun edge function prompten opdateres. Smart swap og validering fungerer allerede korrekt.

