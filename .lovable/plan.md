

## Fix: Standard lejer brev-dropdown ved forsendelse

### Problem
For Standard-lejere med breve sat til "Forsendelse" mangler valgmuligheden "Ekstra afhentningsdag", og labels/priser matcher ikke specifikationen.

**Nuværende dropdown ved forsendelse:**
- Scan nu (30 kr.) ✓
- Standard scanning (0 kr.) ✓
- Afhentning (30 kr.) ✗ (forkert label og pris)
- Destruer (0 kr.) ✓
- *Mangler: Ekstra afhentningsdag*

**Ønsket dropdown:**
- Standard afhentningsdag (0 kr.)
- Ekstra afhentningsdag (30 kr.)
- Standard scanning (0 kr.)
- Scan nu (30 kr.)
- Destruktion (0 kr.)

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. Tilføj `anden_afhentningsdag` til Standard brev "send"-case (linje 79)**
```typescript
case "send": return addDestruer(["afhentning", "anden_afhentningsdag", "standard_scan", "scan"]);
```

**2. Opdater labels for Standard (linje 103-106)**
Tilføj Standard-specifikke labels:
- `afhentning` → "Standard afhentningsdag"
- `anden_afhentningsdag` → "Ekstra afhentningsdag"

**3. Ret priser for Standard breve (linje 227-231)**
Adskil `afhentning` (0 kr.) og `anden_afhentningsdag` (30 kr.) i stedet for at give begge 30 kr.

