

## Tilføj resterende lande til kuvert-landekoder

### Status
USA (`"usa": "US"`, `"united states": "US"`) er allerede i listen. De fleste vest- og nordeuropæiske lande er dækket. Men flere europæiske lande mangler stadig.

### Manglende lande at tilføje

**Fil**: `src/components/EnvelopePrint.tsx` — udvid `COUNTRY_CODES`

```typescript
// Balkan / Sydøsteuropa
"serbien": "RS", "serbia": "RS",
"montenegro": "ME",
"bosnien": "BA", "bosnia": "BA", "bosnien-hercegovina": "BA",
"nordmakedonien": "MK", "north macedonia": "MK", "macedonia": "MK",
"albanien": "AL", "albania": "AL",
"kosovo": "XK",

// Østeuropa
"ukraine": "UA",
"hviderusland": "BY", "belarus": "BY",
"moldova": "MD",

// Sydeuropa / småstater
"tyrkiet": "TR", "turkey": "TR", "türkiye": "TR",
"monaco": "MC",
"liechtenstein": "LI",
"andorra": "AD",
"san marino": "SM",

// Nordamerika
"canada": "CA",
"mexico": "MX",

// Andre almindelige
"australien": "AU", "australia": "AU",
"japan": "JP",
"kina": "CN", "china": "CN",
"indien": "IN", "india": "IN",
"brasilien": "BR", "brazil": "BR",
"sydafrika": "ZA", "south africa": "ZA",
"sydkorea": "KR", "south korea": "KR",
"israel": "IL",
"new zealand": "NZ",
"singapore": "SG",
"hong kong": "HK",
"forenede arabiske emirater": "AE", "united arab emirates": "AE",
"saudi-arabien": "SA", "saudi arabia": "SA",
"thailand": "TH",
"taiwan": "TW",
```

Én fil, én ændring — tilføjer ~40 nye landekoder (dansk + engelsk) så kuverter til alle gængse destinationer får korrekt landekode.

