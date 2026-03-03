

## Lejerliste og lejervisning for operatører

### Ændringer

**1. Ny side: `src/pages/TenantsPage.tsx`**
- Henter alle lejere med `tenants` + `tenant_types(name)` join
- Henter antal nye breve per lejer via `mail_items` med `status = 'ny'` grupperet per `tenant_id`
- Viser en tabel med kolonner: Lejer navn, Lejertype (med farve-badge), Antal nye breve
- Klik på en række navigerer til `/tenants/:id`

**2. Ny side: `src/pages/TenantDetailPage.tsx`**
- Operatør-visning af en enkelt lejers indstillinger (genbruger samme layout som `SettingsPage`)
- Henter lejer-data via `tenants` + `tenant_types` baseret på URL-param `:id`
- Operatøren kan redigere: kontaktoplysninger, forsendelsesadresse, standardhandlinger
- Viser virksomhedsinfo, priskort (MailPricingCard / PackagePricingCard)
- Tilbage-knap til `/tenants`

**3. `src/App.tsx`**
- Tilføj routes: `/tenants` → `TenantsPage` og `/tenants/:id` → `TenantDetailPage`

**4. `src/components/AppSidebar.tsx`**
- Allerede har "Lejere" med URL `/tenants` i `operatorItems` — ingen ændring nødvendig

### Datahentning for "antal nye breve"

Forespørgsel der tæller nye breve per lejer:
```sql
SELECT tenant_id, COUNT(*) 
FROM mail_items 
WHERE status = 'ny' AND tenant_id IS NOT NULL
GROUP BY tenant_id
```

I koden bruges to queries: en for lejere og en for mail_items med status='ny', derefter grupperes i JS.

### Filoversigt

| Fil | Ændring |
|---|---|
| `src/pages/TenantsPage.tsx` | Ny — lejerliste med tabel |
| `src/pages/TenantDetailPage.tsx` | Ny — operatør-redigering af enkelt lejer |
| `src/App.tsx` | Tilføj `/tenants` og `/tenants/:id` routes |

