

## Zoho CRM Integration: Automatisk oprettelse af lejer ved vundet deal

### Oversigt
Når en deal i Zoho CRM skifter til "Closed - Won", sender Zoho automatisk data til Flexum via en webhook. En edge function modtager data og opretter lejeren i systemet med kontaktoplysninger fra den tilhørende Zoho-account.

### Arkitektur

```text
Zoho CRM (Deal → Closed Won)
       │
       ▼  webhook POST
Edge Function: zoho-crm-webhook
       │
       ▼  opretter
Tenants-tabel i Flexum
```

### Trin-for-trin guide

**Trin 1: Opsætning i Lovable (vi bygger)**
- Ny edge function `zoho-crm-webhook` der modtager webhook-kald fra Zoho
- Funktionen validerer en hemmelig nøgle (webhook secret) for sikkerhed
- Opretter en lejer med data fra Zoho (firmanavn, kontaktperson, e-mail)
- Tildeler en standard lejer-type (du vælger hvilken)

**Trin 2: Tilføj webhook-hemmelighed**
- Vi genererer en sikker nøgle som du gemmer som secret i projektet (`ZOHO_WEBHOOK_SECRET`)

**Trin 3: Opsætning i Zoho CRM (du skal gøre)**
Vi guider dig trin-for-trin:
1. Gå til **Zoho CRM → Setup → Automation → Workflow Rules**
2. Opret en ny regel for modulet **Deals**
3. Sæt betingelse: **Stage = Closed - Won**
4. Tilføj handling: **Webhook**
5. Indsæt webhook-URL (vi giver dig den præcise URL)
6. Vælg POST-metode og JSON-format
7. Tilføj de felter vi har brug for (firmanavn, kontakt-email, kontaktnavn)

### Tekniske detaljer

**Ny edge function: `supabase/functions/zoho-crm-webhook/index.ts`**
- Validerer `x-webhook-secret` header eller `?secret=` query-parameter
- Modtager JSON med deal- og account-data fra Zoho
- Opretter tenant i `tenants`-tabellen med: `company_name`, `contact_email`, `contact_first_name`, `contact_last_name`, `tenant_type_id` (standard-type)
- Logger resultatet for fejlsøgning
- Returnerer 200 OK til Zoho

**Ny secret:** `ZOHO_WEBHOOK_SECRET` — tilfældig nøgle til at sikre at kun Zoho kan kalde webhook'en

**Config:** Tilføj `zoho-crm-webhook` til `supabase/config.toml` med `verify_jwt = false` (webhook fra ekstern tjeneste)

### Datafelter fra Zoho → Flexum

| Zoho-felt | Flexum-felt |
|-----------|-------------|
| Account Name | company_name |
| Contact Email / Deal Contact | contact_email |
| Contact First Name | contact_first_name |
| Contact Last Name | contact_last_name |

### Åbent spørgsmål
- Hvilken lejer-type skal nye lejere fra Zoho tildeles som standard? (f.eks. Lite, Standard, osv.)
- Er der andre felter fra Zoho du gerne vil have med (adresse, telefon, osv.)?

