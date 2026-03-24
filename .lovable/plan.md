

## Fuldstændig i18n-refaktorering — Fase 2

Alle sider og komponenter skal opdateres til at bruge `t()` fra react-i18next, og LanguageToggle skal indsættes i UI'et.

### Ændringer

**1. Indsæt LanguageToggle i UI**
- `AppLayout.tsx` — Tilføj `<LanguageToggle />` i headeren ved siden af NotificationBell
- `Login.tsx` — Tilføj `<LanguageToggle />` øverst på login-siden

**2. Refaktorer sider (14 filer)**
Erstat alle hardkodede strenge med `t()` kald:
- `Login.tsx` — login-form labels, fejlbeskeder, toast-tekster
- `OperatorDashboard.tsx` — ACTION_LABELS, STATUS_LABELS, tabel-headers, knapper, søgefelt, toast-beskeder
- `TenantDashboard.tsx` — ACTION_LABELS, STATUS_LABELS, tabel-headers, dropdown-labels, pris-tekster
- `TenantsPage.tsx` — titler, tabel-headers, statusser
- `TenantDetailPage.tsx` — alle labels og sektioner
- `TenantViewPage.tsx` — profilvisning, labels
- `SettingsPage.tsx` — indstillinger, tabs, labels
- `ShippingAddressPage.tsx` — formular-labels
- `ShippingPrepPage.tsx` — forsendelsesflow-tekster
- `BulkUploadPage.tsx` — upload-instruktioner
- `NotificationsPage.tsx` — titler, knapper
- `SetPasswordPage.tsx` — formular-labels
- `NotFound.tsx` — fejlside-tekster
- `Index.tsx` — routing/redirects (minimal)

**3. Refaktorer komponenter (~12 filer)**
- `AppSidebar.tsx` — menupunkter, log ud-knap
- `AppLayout.tsx` — hilsener (Godmorgen osv.)
- `NotificationBell.tsx` — tooltip, labels
- `RegisterMailDialog.tsx` — formular, labels, toast
- `AssignTenantDialog.tsx` — dialog-tekster
- `MailItemLogSheet.tsx` — log-labels
- `OperatorMailItemDialog.tsx` — dialog-tekster, handlinger
- `ShippingAddressGuard.tsx` — advarsel-tekster
- `DefaultActionSetup.tsx` — dialog, dropdown-labels
- `EmailTemplatesEditor.tsx` — editor-labels
- `ClosedDaysCalendar.tsx` — kalender-labels
- `OperatorsList.tsx` — liste-labels
- `BulkMailReviewTable.tsx` — tabel-headers
- `BulkUploadDropzone.tsx` — instruktioner
- `PricingOverview.tsx` / `PricingSettingsEditor.tsx` — pris-labels
- `EnvelopePrint.tsx` — print-labels

**4. Opdater oversættelsesfiler**
- Tilføj eventuelle manglende nøgler til `da.json` og `en.json` undervejs

### Mønster for hver fil
```tsx
import { useTranslation } from "react-i18next";
// ...
const { t } = useTranslation();
// Erstat "Godmorgen" → t("greeting.morning")
// Erstat "Forsendelse" → t("actions.send")
```

For konstanter som `ACTION_LABELS` — konvertér til funktion:
```tsx
const getActionLabels = (t: TFunction) => ({
  scan: t("actions.scan"),
  send: t("actions.send"),
  // ...
});
```

