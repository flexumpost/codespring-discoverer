

## Opdater adressevisning på ShippingPrepPage

### Ændringer

**`src/pages/ShippingPrepPage.tsx`:**

1. **Udvid data-query** — tilføj `shipping_state` og `shipping_country` til select-felterne fra `tenants`
2. **Udvid `MailItemWithTenant` type** — tilføj `shipping_state` og `shipping_country`
3. **Udvid grouped map** — medtag `shipping_state` og `shipping_country`
4. **Tilføj landekode-mapping** — en funktion der konverterer landnavn til ISO-kode:

```typescript
const COUNTRY_CODES: Record<string, string> = {
  "danmark": "DK", "sweden": "SE", "sverige": "SE",
  "norway": "NO", "norge": "NO", "finland": "FI",
  "germany": "DE", "tyskland": "DE", "united states": "US", "usa": "US",
  // ... osv.
};
function getCountryCode(country: string): string {
  return COUNTRY_CODES[country.toLowerCase().trim()] ?? "";
}
```

5. **Opdater adressevisning** i card-headeren til:

```text
[Modtager navn]          📋
[c/o navn]               📋
[Adresse]                📋
[DK] - [2800] [Kongens Lyngby]  📋
[Stat]                   📋
[Land]                   📋
```

- Tomme felter vises ikke
- Landekode indsættes foran postnummer/by-linjen baseret på `shipping_country`
- Hver linje har kopi-ikon som nu

### Filer

| Fil | Handling |
|---|---|
| `src/pages/ShippingPrepPage.tsx` | Udvid query, type, grouped data og adressevisning |

