

## OfficeRnD-integration: Automatisk overførsel af gebyrer ved arkivering

### Oversigt
Når en forsendelse arkiveres, beregner systemet automatisk gebyret og opretter en charge i OfficeRnD via deres API. Lejeren mappes til OfficeRnD-medlemmer via e-mail-adresse.

### Forudsætninger fra brugeren
1. **OfficeRnD API-credentials** — opret en applikation i OfficeRnD (Settings → Integrations → Applications) for at få `client_id` og `client_secret`
2. **Organisation-slug** — findes under Settings → My Account i OfficeRnD
3. Lejernes `contact_email` i denne app skal matche medlemmernes e-mail i OfficeRnD

### Teknisk plan

**1. Secrets (3 stk.)**
- `OFFICERND_CLIENT_ID`
- `OFFICERND_CLIENT_SECRET`
- `OFFICERND_ORG_SLUG`

**2. Ny tabel: `officernd_sync_log`**
Logger hvert synkroniseringsforsøg for fejlsøgning og idempotens (undgår dobbeltopkrævninger).

| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | uuid | PK |
| mail_item_id | uuid | FK til mail_items |
| charge_id | text | OfficeRnD charge-ID |
| amount_text | text | Gebyrstreng ("30 kr. + porto") |
| status | text | pending/success/failed |
| error_message | text | Fejlbesked ved fejl |
| created_at | timestamptz | Tidsstempel |

**3. Ny Edge Function: `sync-officernd-charge`**
- Modtager `mail_item_id` via POST
- Henter mail_item med tenant, tenant_type og beregner gebyr (genbruger samme logik som dashboardet)
- Slår OfficeRnD-medlem op via `GET /members?email={contact_email}`
- Opretter charge via `POST /charges` med beløb og beskrivelse
- Logger resultatet i `officernd_sync_log`
- OAuth2 client credentials flow: henter token fra `https://identity.officernd.com/auth/token`

**4. Database-trigger på `mail_items`**
Når `status` ændres til `arkiveret`, kalder triggeren en `pg_net.http_post` til Edge Function med `mail_item_id`. Dette sikrer automatisk synkronisering uden ændringer i frontend-koden.

**5. Operatør-indstillinger (valgfrit)**
Tilføj en sektion i Settings-siden hvor operatøren kan:
- Indtaste OfficeRnD org-slug
- Se sync-status/log
- Slå integrationen til/fra

### Flow
```text
Mail arkiveres → DB trigger → Edge Function
  → Beregn gebyr
  → Find OfficeRnD medlem (via email)
  → Opret charge i OfficeRnD
  → Log resultat
```

### Begrænsninger
- Porto-beløbet kendes ikke i systemet (vises som "+ porto") — kun det faste gebyr kan overføres automatisk. Porto skal enten tilføjes manuelt eller som et fast estimat.
- Lejere uden matchende e-mail i OfficeRnD vil fejle med en logget fejlbesked.

