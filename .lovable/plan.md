

## Internationalisering (i18n) — Dansk/Engelsk med sprogskifter

### Omfang
Appen har hardkodede danske strenge i **25+ filer** (14 pages, 10+ komponenter). Der er ca. 500+ unikke tekststrenge der skal oversættes.

### Tilgang: react-i18next

1. **Installer `react-i18next` og `i18next`** — industristandard for React i18n

2. **Opret oversættelsesfiler**
   - `src/i18n/locales/da.json` — alle danske strenge (nuværende tekster)
   - `src/i18n/locales/en.json` — engelske oversættelser
   - Struktur grupperet pr. område: `common`, `nav`, `dashboard`, `login`, `settings`, `tenants`, `shipping`, `notifications`, osv.

3. **Opret `src/i18n/index.ts`** — i18next konfiguration med:
   - Default sprog: `da`
   - Fallback: `da`
   - Sprog gemmes i `localStorage` så valget huskes

4. **Sprogskifter i header** — Toggle-knap i `AppLayout.tsx` header (ved siden af NotificationBell):
   - Simpel DA/EN toggle med flag-ikoner eller tekst
   - Også på Login-siden (uden header)

5. **Opdater alle filer** — Erstat hardkodede strenge med `t()` kald:
   - **Sider** (14 filer): Login, OperatorDashboard, TenantDashboard, TenantsPage, TenantDetailPage, TenantViewPage, SettingsPage, ShippingAddressPage, ShippingPrepPage, BulkUploadPage, NotificationsPage, SetPasswordPage, NotFound, Index
   - **Komponenter** (~12 filer): AppLayout, AppSidebar, NotificationBell, RegisterMailDialog, AssignTenantDialog, MailItemLogSheet, OperatorMailItemDialog, ShippingAddressGuard, DefaultActionSetup, EmailTemplatesEditor, ClosedDaysCalendar, OperatorsList, m.fl.
   - **Dato-formatering**: Brug `date-fns/locale` dynamisk baseret på valgt sprog (`da` eller `enGB`)
   - **Labels/records** som `ACTION_LABELS`, `STATUS_LABELS`: Gør dem til funktioner der bruger `t()`

6. **Initialiser i18n i `src/main.tsx`** — Import `src/i18n` før app render

### Tekniske detaljer

```text
src/
├── i18n/
│   ├── index.ts              ← i18next config
│   └── locales/
│       ├── da.json            ← ~500 danske strenge
│       └── en.json            ← ~500 engelske strenge
```

Oversættelsesfil-struktur (eksempel):
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "tenants": "Tenants",
    "settings": "Settings",
    "shippingPrep": "Send letters and packages",
    "shippingAddress": "Shipping address",
    "signOut": "Sign out"
  },
  "greeting": {
    "morning": "Good morning",
    "lateMorning": "Good late morning",
    "noon": "Good afternoon",
    "afternoon": "Good afternoon",
    "evening": "Good evening"
  },
  "actions": {
    "scan": "Scan now",
    "send": "Shipment",
    "pickup": "Pickup",
    "destroy": "Destroy"
  }
}
```

### Vigtigt
- Dette er en stor opgave der berører 25+ filer
- Alle toast-beskeder, labels, placeholders, titler og tooltips skal oversættes
- Database-enums (som `mail_status`) forbliver på dansk i databasen — kun UI-labels oversættes

