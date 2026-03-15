

## Velkomst e-mail funktion på lejeroversigten

### Ændringer

**1. Database-migration** — Tilføj `welcome_email_sent_at` kolonne til `tenants`:
```sql
ALTER TABLE public.tenants ADD COLUMN welcome_email_sent_at timestamptz;
```

**2. Edge function `send-welcome-email`**
- Modtager en liste af tenant IDs
- Henter `email_templates` med `slug = 'welcome'` for subject/body
- Henter tenant data (company_name, contact_email) for hvert tenant ID
- Springer lejere over der mangler contact_email
- Sender email via Lovable API (`LOVABLE_API_KEY`)
- Opdaterer `welcome_email_sent_at` til `now()` for hver lejer der modtog email
- Returnerer en liste over succesfulde/fejlede afsendelser

**3. `src/pages/TenantsPage.tsx`** — UI-ændringer:
- Tilføj state: `selectedTenantIds: Set<string>`, `sendWelcomeOnCreate: boolean`
- **Header**: Tilføj "Send velkomst e-mail" knap ved siden af "Opret ny lejer"
- **Tabel**: Tilføj checkbox-kolonne (med "Vælg alle" i header), og "Velkomst e-mail" kolonne der viser dato eller "–"
- **Opret dialog**: Tilføj checkbox "Send velkomst e-mail"
- **Send-logik**: Kalder edge function `send-welcome-email` med valgte tenant IDs. Ved oprettelse: hvis checkbox er markeret, send efter insert
- Checkboxen i rækken skal have `e.stopPropagation()` så den ikke navigerer til detaljesiden

**4. Kolonne "Velkomst e-mail"**:
- Viser dato formateret (f.eks. "12. mar 2026") hvis `welcome_email_sent_at` er sat
- Viser "–" hvis ikke sendt endnu

| Fil | Ændring |
|---|---|
| Migration | Tilføj `welcome_email_sent_at` kolonne |
| `supabase/functions/send-welcome-email/` | Ny edge function til afsendelse |
| `TenantsPage.tsx` | Checkboxes, knap, kolonne, opret-dialog checkbox |

### Teknisk detalje: Email-afsendelse

Edge function'en bruger Lovable API til at sende emails. Den henter skabelonen fra `email_templates`-tabellen (slug `welcome`), erstatter eventuelle placeholders (f.eks. `{{company_name}}`), og sender via Lovable's email API med `LOVABLE_API_KEY`.

