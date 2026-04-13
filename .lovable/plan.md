

## Opdatering af Zoho webhook med forsendelsesadresse og pakkeløsning

### Oversigt
Webhook'en udvides til at modtage forsendelsesadresse og pakkeløsning fra Zoho Account-modulet og gemme det på lejeren ved oprettelse.

### Feltmapping: Zoho → Flexum

| Zoho-felt (fra din body) | Flexum-felt (tenants-tabel) |
|---|---|
| Forsendelse navn | shipping_recipient |
| Forsendelse c/o navn | shipping_co |
| Forsendelse adresse | shipping_address |
| Forsendelse postnummer | shipping_zip |
| Forsendelse by | shipping_city |
| Forsendelse stat | shipping_state |
| Forsendelse land | shipping_country |
| Navn for pakke løsning | Bruges til at slå tenant_type op (i stedet for altid "Lite") |
| Løsning kort | Logges, men bruges ikke direkte |

**"Forsendelse adresse 2"** — tenants-tabellen har ikke et dedikeret felt til adresselinje 2. Jeg foreslår at tilføje en ny kolonne `shipping_address_2` til tabellen, så adressen kan vises korrekt på forsendelsessiden.

### Ændringer

**1. Database-migration**
- Tilføj kolonne `shipping_address_2` (text, nullable) til `tenants`-tabellen

**2. Edge function: `zoho-crm-webhook/index.ts`**
- Parse de nye felter fra body (forsendelse-adresse, pakkeløsning)
- Slå tenant_type op baseret på "Navn for pakke løsning" i stedet for altid at bruge "Lite" — falder tilbage til "Lite" hvis typen ikke findes
- Gem forsendelsesadresse-felterne ved oprettelse af lejer
- Sæt `shipping_confirmed: true` da adressen kommer fra Zoho

**3. UI-opdateringer**
- Opdater ShippingPrepPage, TenantDetailPage, ShippingAddressGuard og ShippingAddressPage til at vise/håndtere `shipping_address_2` (vises mellem adresselinje 1 og postnummer)

**4. Opdateret Zoho JSON body**
Du skal bruge denne body i din Zoho webhook:

```json
{
  "account_name": "${Accounts.Account Name}",
  "contact_email": "${Accounts.Kontaktperson E-mail}",
  "contact_first_name": "${Accounts.Kontaktperson fornavn}",
  "contact_last_name": "${Accounts.Kontaktperson efternavn}",
  "shipping_recipient": "${Accounts.Forsendelse navn}",
  "shipping_co": "${Accounts.Forsendelse c/o navn}",
  "shipping_address": "${Accounts.Forsendelse adresse}",
  "shipping_address_2": "${Accounts.Forsendelses adresse 2}",
  "shipping_zip": "${Accounts.Forsendelse postnummer}",
  "shipping_city": "${Accounts.Forsendelse by}",
  "shipping_state": "${Accounts.Forsendelse stat}",
  "shipping_country": "${Accounts.Forsendelse land}",
  "package_solution": "${Accounts.Navn for pakke løsning}",
  "solution_short": "${Accounts.Løsning kort}",
  "deal_name": "${Deals.Deal Name}"
}
```

### Tekniske detaljer

- Pakkeløsningen bruges til at finde den rigtige `tenant_type` via `tenant_types.name`. Hvis navnet ikke matcher nogen type, bruges "Lite" som fallback.
- Forsendelsesadressen gemmes direkte, og `shipping_confirmed` sættes til `true` så lejeren ikke bliver bedt om at udfylde adressen igen.
- `shipping_address_2` vises i UI som en ekstra linje under adressen (før postnummer/by).

