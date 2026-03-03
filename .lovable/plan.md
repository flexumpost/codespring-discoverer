

## Tilføj forsendelsesadresse-kort på indstillingssiden

Tilføjer en ny redigerbar "Forsendelsesadresse"-boks under de eksisterende kort på SettingsPage, med 7 adressefelter som gemmes i `tenants`-tabellen.

### 1. Database-migration

Tilføj 6 nye kolonner til `tenants`-tabellen (den eksisterende `address`-kolonne genbruges ikke, da den er til firmaadresse):

| Kolonne | Type | Nullable | Default |
|---|---|---|---|
| `shipping_recipient` | text | YES | NULL |
| `shipping_co` | text | YES | NULL |
| `shipping_address` | text | YES | NULL |
| `shipping_zip` | text | YES | NULL |
| `shipping_city` | text | YES | NULL |
| `shipping_state` | text | YES | NULL |
| `shipping_country` | text | YES | NULL |

Alle nullable — obligatorisk-validering sker client-side inden gem.

### 2. SettingsPage.tsx

Tilføj et tredje `Card` under "Kontaktoplysninger" med titlen **"Forsendelsesadresse"**:

- 7 state-variabler (eller et samlet objekt) initialiseret fra `selectedTenant`
- Felter: Modtager navn*, c/o navn, Adresse*, Postnummer*, By*, Stat, Land*
- Obligatoriske felter markeres visuelt og valideres client-side inden gem
- Separat "Gem"-knap der kører `supabase.from("tenants").update(...)` med de 7 felter
- `hasShippingChanges`-check for at disable knappen når intet er ændret

Kun 1 fil ændres (+ migration). Eksisterende RLS-policies på `tenants` dækker allerede tenant-update via "Tenants update own mail action"-lignende policies — men `tenants`-tabellen har kun operator-update-policy. Lejere kan opdatere `contact_name`/`contact_email` allerede, så den eksisterende kode virker via operator-policy eller tenant-select + en manglende tenant-update-policy. Lad mig tjekke: tenants har kun "Operators update tenants" — men SettingsPage kører `update` på tenants. Det virker kun hvis brugeren er operator. For lejere skal vi tilføje en RLS-policy der tillader lejere at opdatere egne rækker (begrænsede kolonner).

### 3. RLS: Lejer-update-policy på tenants

Tilføj policy:
```sql
CREATE POLICY "Tenants update own tenant"
ON public.tenants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

Dette giver lejere mulighed for at opdatere deres egne tenant-rækker (kontaktinfo + forsendelsesadresse).

