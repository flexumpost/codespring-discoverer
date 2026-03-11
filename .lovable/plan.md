

## Forsendelsesadresse-bekræftelse ved login

### Forretningslogik

- **Første login**: Bruger skal bekræfte eller redigere eksisterende forsendelsesadresse, eller oprette en ny hvis ingen findes.
- **Efterfølgende login**: Kun kræv adresse hvis ingen er registreret.

### Tilgang

Tilføj et `shipping_confirmed` boolean-felt til `tenants`-tabellen (default `false`). Brug dette til at skelne mellem første og efterfølgende login.

### Ændringer

| Ændring | Detalje |
|---|---|
| **Database-migration** | Tilføj `shipping_confirmed boolean default false` til `tenants` |
| **Ny komponent: `ShippingAddressGuard.tsx`** | Wrapper der tjekker tenant-data: hvis `shipping_confirmed = false` ELLER ingen adresse → vis forsendelsesadresse-dialog/modal. Operatører springes over. |
| **`src/pages/Index.tsx`** | Wrap tenant-dashboard med `ShippingAddressGuard` |
| **`src/pages/ShippingAddressPage.tsx`** | Tilføj "Bekræft"-logik der sætter `shipping_confirmed = true` ved gem |

### Komponent-flow

```text
Index.tsx
  └─ role === "operator" → OperatorDashboard (ingen guard)
  └─ role !== "operator" → ShippingAddressGuard
       ├─ shipping_confirmed=true OG adresse findes → TenantDashboard
       ├─ shipping_confirmed=false → Modal: "Bekræft din forsendelsesadresse"
       └─ ingen adresse → Modal: "Opret forsendelsesadresse"
```

### ShippingAddressGuard logik

- Henter tenant-data via `useTenants`
- Tjekker `shipping_confirmed` og om `shipping_recipient` + `shipping_address` + `shipping_zip` + `shipping_city` + `shipping_country` er udfyldt
- Hvis guard trigger: Vis en fullscreen dialog med adresseformularen (genbrug felterne fra `ShippingAddressPage`)
- Ved gem: sæt `shipping_confirmed = true` sammen med adressedata
- Dialog kan ikke lukkes uden at udfylde obligatoriske felter

### Database

```sql
ALTER TABLE public.tenants 
ADD COLUMN shipping_confirmed boolean NOT NULL DEFAULT false;
```

Eksisterende lejere med udfyldt adresse kan evt. sættes til `true` med en data-migration, eller de vil blot blive bedt om at bekræfte ved næste login (anbefalet).

