

## Pakker for Lite-lejere: Månedlig forsendelse, status og gebyr

### Problem
1. **Forsendelsesdato**: `getNextShippingDate()` bruger `getNextThursday()` for Lite-pakker — den skal bruge `getFirstThursdayOfMonth()` (samme som Lite-breve).
2. **Status-tekst**: Pakker viser "Sendes [dato]", men skal vise "Sendes senest [dato]" for at signalere at pakken kan sendes tidligere.
3. **Gebyr for pakker**: Nuværende `getItemFee` og `getActionPrice` håndterer ikke pakkegebyrer korrekt for Lite. Regler:
   - Forsendelse (send): **50 kr.**
   - Afhentning: **50 kr.** (uanset dag)
   - Destruer: **0 kr.**

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. `getNextShippingDate` (linje 244-249)**
Udvid til også at bruge `getFirstThursdayOfMonth()` for Lite-pakker:
```typescript
if (tenantType === "Lite") {
  return getFirstThursdayOfMonth();
}
```

**2. `getStatusDisplay` (linje 302-305, 317-324)**
Når `mail_type === "pakke"`, vis "Sendes senest" i stedet for "Sendes":
- Linje 294-296: `standard_forsendelse` → "Sendes senest [dato]" for pakker
- Linje 302-305: `send` → "Sendes senest [dato]" for pakker
- Linje 321-324: default send → "Sendes senest [dato]" for pakker

**3. `getItemFee` (linje 130-173)**
Tilføj pakke-specifik logik for Lite:
- `send` / `standard_forsendelse` → "50 kr."
- `afhentning` → "50 kr." (ingen gratis-torsdag for pakker)
- `destruer` → "0 kr."

**4. `getActionPrice` (linje 176-195)**
Tilføj pakke-specifik prislabel i dropdown:
- For pakker hos Lite: `send` = "50 kr.", `afhentning` = "50 kr.", `destruer` = "0 kr."

**5. `getExtraActions` (linje 53-55)**
Tilføj `standard_forsendelse` som option for Lite-pakker (gratis månedlig forsendelse), og `destruer` skal vise "0 kr.".

### Fil
- **Ændret**: `src/pages/TenantDashboard.tsx` — 5 funktioner opdateres

