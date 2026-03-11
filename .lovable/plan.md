

## Checkbox: "Samme forsendelsesadresse som [firmanavn]"

### Hvad ændres

Når en bruger har flere virksomheder, vises en checkbox over adresseformularen: **"Samme forsendelsesadresse som [første firmanavn]"**. Når den aktiveres, kopieres adressen fra det første firma og felterne låses (disabled). Ved gem gemmes de kopierede data på den aktuelle tenant.

### Ændringer

| Fil | Ændring |
|---|---|
| `src/pages/ShippingAddressPage.tsx` | Tilføj checkbox når `tenants.length > 1` og valgt tenant ikke er den første. Når checked: kopier adressedata fra første tenant og disable felterne. Ved gem: gem kopierede data + `shipping_confirmed = true`. |
| `src/components/ShippingAddressGuard.tsx` | Samme checkbox-logik i guard-dialogen. Brug `useTenants` til at finde andre tenants med udfyldt adresse. |

### Logik

- Checkbox vises kun når: bruger har 2+ tenants OG mindst én anden tenant har en udfyldt adresse
- "Første firma" = den første tenant i listen der har en komplet adresse (ikke nødvendigvis den valgte)
- Når checkbox aktiveres: alle adressefelter udfyldes med data fra referencefirmaet og disables
- Når checkbox deaktiveres: felterne låses op igen (beholder kopierede værdier som udgangspunkt)
- Ved gem: data gemmes normalt på den valgte tenant uanset om det er kopieret eller ej

### UI-placering

Checkboxen placeres direkte over adressefelterne i Card-komponenten, under CardTitle.

