

## Fix: Tilføj Letland (LV) til landekode-opslagstabellen

### Problem
`COUNTRY_CODES` i `EnvelopePrint.tsx` indeholder ikke Letland. Når kunden Innels ApS har "Letland" eller "Latvia" som forsendelsesland, returnerer `getCountryCode()` en tom streng, og landekoden "LV" vises ikke på kuverten.

### Løsning

**Fil**: `src/components/EnvelopePrint.tsx`, linje 38 (efter Tjekkiet)

Tilføj Letland samt de øvrige baltiske lande og andre manglende EU-lande for at undgå lignende problemer fremover:

```typescript
"letland": "LV", "latvia": "LV",
"litauen": "LT", "lithuania": "LT",
"estland": "EE", "estonia": "EE",
"ungarn": "HU", "hungary": "HU",
"rumænien": "RO", "romania": "RO",
"bulgarien": "BG", "bulgaria": "BG",
"kroatien": "HR", "croatia": "HR",
"slovenien": "SI", "slovenia": "SI",
"slovakiet": "SK", "slovakia": "SK",
"luxembourg": "LU",
"malta": "MT",
"cypern": "CY", "cyprus": "CY",
```

Én fil, én ændring. Herefter vil "LV" korrekt vises på kuverter til Letland.

