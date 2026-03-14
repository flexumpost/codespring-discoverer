

## Tre ændringer for Standard-lejere

### 1. Tilføj "Standard scanning" for Standard-breve

**`src/pages/TenantDashboard.tsx`**

- **getExtraActions (linje 60-66):** Tilføj `standard_scan` i Standard's action-lister, samme mønster som Lite:
  ```
  case "afhentning": return ["scan", "standard_scan", "send", "anden_afhentningsdag"];
  case "scan":       return ["standard_scan", "send", "afhentning"];
  case "standard_scan": return ["scan", "send", "afhentning"];
  case "send":       return ["scan", "standard_scan", "afhentning"];
  default:           return ["scan", "standard_scan", "afhentning", "send"];
  ```

- **getActionLabel (linje 81-88):** Tilføj Standard-specifikke labels:
  ```
  if (tenantTypeName === "Standard") {
    if (action === "scan") return "Scan nu";
    if (action === "standard_scan") return "Standard scanning";
  }
  ```

- **getActionPrice (linje 171-175):** Tilføj `standard_scan` for Standard:
  ```
  if (action === "standard_scan") return "0 kr.";
  ```

- **getStatusDisplay (linje 277-280):** `standard_scan` for Standard skal vise næste torsdag (ugentlig kadence) i stedet for første torsdag i måneden. Tilføj tier-check:
  ```
  if (item.chosen_action === "standard_scan") {
    const nextDate = tenantTypeName === "Lite" ? getFirstThursdayOfMonth() : getNextThursday();
    return ["Scannes", formatDanishDate(nextDate)];
  }
  ```
  (Kræver at `tenantTypeName` sendes som parameter til `getStatusDisplay` — den modtager det allerede.)

### 2. Omdøb "Åben og scan" til "Scan nu"

- **ACTION_LABELS (linje 36):** Ændr `scan: "Åben og scan"` → `scan: "Scan nu"`.

### 3. Afhentning gratis på standard-torsdage for Standard

Allerede implementeret! `isFreeTorsdag` returnerer `true` for enhver torsdag for Standard (linje 101), og `getItemFee` bruger dette (linje 150-153). Afhentningskalenderen skal dog kontrolleres for at sikre at gebyret vises korrekt i dropdown.

- **getActionPrice (linje 171-174):** Ændr afhentning-prisen for Standard til at vise "0-30 kr." eller lignende. Bedre: vis "30 kr." i dropdown (som nu), da den præcise pris afhænger af den valgte dato — det korrekte beløb vises i gebyr-kolonnen efter valg.

### Ændringer i `src/pages/OperatorDashboard.tsx`

- **ACTION_LABELS:** Ændr `scan: "Åben og scan"` → `scan: "Scan nu"`.
- **getOperatorStatusDisplay:** Tilføj case for `standard_scan` hos Standard → "Scanning bestilt [næste torsdag]".

### Ændringer i `src/components/MailItemLogSheet.tsx`

- **ACTION_LABELS:** Ændr `scan: "Åben og scan"` → `scan: "Scan nu"` (hvis den bruger samme label).

