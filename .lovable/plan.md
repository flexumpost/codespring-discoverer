

## Tilføj kopi-ikoner til adresselinjer i Send breve og pakker

### Ændring

**`src/pages/ShippingPrepPage.tsx`** — I kortets header-sektion (linje 280-297), tilføj et `Copy`-ikon fra lucide-react ved siden af hver adresselinje. Ved klik kopieres den pågældende tekst til udklipsholderen med en toast-bekræftelse.

Berørte linjer:
- **Firma-navn** (linje 280): `{group.companyNames.join(", ")}` + kopi-ikon
- **Modtager** (linje 291): `{group.shippingRecipient}` + kopi-ikon  
- **Adresse** (linje 293): `{group.shippingAddress}` + kopi-ikon
- **Postnr og by** (linje 295): Separat kopi-ikon for postnr og by

Hjælpefunktion:
```typescript
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast({ title: "Kopieret", description: text });
};
```

Hvert kopi-ikon er en lille klikbar `Copy`-ikon (lucide-react) med `cursor-pointer` og hover-effekt, placeret inline efter teksten.

### Fil
- **Ændret**: `src/pages/ShippingPrepPage.tsx`

