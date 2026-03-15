

## Fix: Velkomst e-mail template placeholder

### Problem
Edge function'en `send-welcome-email` erstatter kun `{{company_name}}`, men den faktiske skabelon i databasen bruger `{{name}}` som placeholder. Det betyder at `{{name}}` ikke bliver erstattet i den sendte email.

### Løsning

**`supabase/functions/send-welcome-email/index.ts`** (linje 81, 93-94):
- Hent også `contact_name` fra tenants-tabellen
- Tilføj replacement af `{{name}}` med `contact_name` (eller `company_name` som fallback)
- Behold `{{company_name}}`-replacement så begge placeholders virker

```typescript
// Linje 81: tilføj contact_name
.select("id, company_name, contact_name, contact_email")

// Linje 93-94: erstat begge placeholders
const name = tenant.contact_name || tenant.company_name;
const subject = template.subject
  .replace(/\{\{company_name\}\}/g, tenant.company_name)
  .replace(/\{\{name\}\}/g, name);
const body = template.body
  .replace(/\{\{company_name\}\}/g, tenant.company_name)
  .replace(/\{\{name\}\}/g, name);
```

Derefter genudrul edge function'en.

| Fil | Ændring |
|---|---|
| `send-welcome-email/index.ts` | Hent `contact_name`, erstat `{{name}}` placeholder |

