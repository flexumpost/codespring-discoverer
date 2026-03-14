

## Vis korrekt gebyr for standardhandlinger på operatør-dashboardet

### Problem
Når en handling matcher standardhandlingen (eller er `standard_forsendelse`/`standard_scan`), returnerer operatør-dashboardet bare "—" i stedet for den korrekte gebyrpris som lejersiden viser (f.eks. "0 kr. + porto" for forsendelser).

### Ændring

**`src/pages/OperatorDashboard.tsx` — `getItemFee` funktion (linje 228-262)**

Erstat de tre early-return "—" med korrekte gebyrtekster:

1. **Linje 229:** `standard_forsendelse` → return `"0 kr. + porto"` i stedet for `"—"`
2. **Linje 230:** `standard_scan` → return `"0 kr."` i stedet for `"—"`
3. **Linje 242-262:** Når `chosen_action === defaultAction`, return den korrekte pris i stedet for `"—"`:
   - Hvis handlingen er `"send"` → `"0 kr. + porto"`
   - Hvis handlingen er `"afhentning"` (og free day) → `"0 kr."`
   - Ellers → `"0 kr."`

