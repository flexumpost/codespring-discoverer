

## Tilføj "Standard scanning" ekstra handling for Lite-breve

### Overblik
Ny ekstra handling `standard_scan` for Lite-lejere: brevet scannes på den første torsdag i måneden (samme kadence som standard forsendelse). Gebyr: 0 kr.

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. ACTION_LABELS (linje ~42):** Tilføj `standard_scan: "Standard scanning"`.

**2. getExtraActions (linje 67-74):** Tilføj `standard_scan` i Lite's action-lister (ved siden af `scan`/`send` etc.). Fjern `standard_scan` fra listen når `currentAction` allerede er `standard_scan` eller `scan`.

**3. getActionLabel (linje 80-84):** Tilføj `if (action === "standard_scan") return "Standard scanning";` for Lite.

**4. getItemFee (linje ~136):** Tilføj `if (chosenAction === "standard_scan") return "0 kr.";` (gratis).

**5. getActionPrice (linje ~159):** Tilføj `if (action === "standard_scan") return "0 kr.";` for Lite.

**6. Status-display (~linje 267):** Tilføj case for `standard_scan` der viser "Scannes" + formatDanishDate(getFirstThursdayOfMonth()).

**7. Filter i availableExtras (linje 729):** Tilføj `a === "standard_scan" && allowedActions.includes("scan")` så handlingen vises når scan er tilladt.

### Ændringer i `src/pages/OperatorDashboard.tsx`

**1. ACTION_LABELS:** Tilføj `standard_scan: "Standard scanning"`.

**2. getOperatorStatusDisplay:** Tilføj case for `standard_scan` → "Scanning bestilt [første torsdag]".

**3. getItemFee:** Tilføj `if (item.chosen_action === "standard_scan") return "—";` (ingen gebyr).

### Ændringer i `src/components/MailItemLogSheet.tsx`

**1. ACTION_MAP:** Tilføj `standard_scan: "Standard scanning"`.

### Ændringer i `src/pages/ShippingPrepPage.tsx`

Ingen ændringer nødvendige — `standard_scan` er en scan-handling, ikke en forsendelse.

