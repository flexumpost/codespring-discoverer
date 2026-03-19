

## Fix Lite brev: "Send hurtigst muligt" gebyr + dropdown-rækkefølge

### Problem 1: "Send hurtigst muligt" gebyr viser ikke "50 kr. + porto"
Operatør-dashboardet bruger `ACTION_TO_FEE_KEY` → `ekstraForsendelse` → "50 kr." uden "+ porto"-suffiks. Gebyret skal inkludere porto-teksten.

### Problem 2: Dropdown-rækkefølge og label
- "Gratis afhentning" skal flyttes ned under "Afhentning"
- "Afhentning" skal omdøbes til "Hurtig afhentning"

---

### Ændringer

**`src/pages/OperatorDashboard.tsx`**

1. I `getItemFee`: Tilføj eksplicit håndtering af `send` for Lite breve, så gebyret returnerer "50 kr. + porto" i stedet for bare "50 kr." fra pricing-tabellen. Indsæt check før `ACTION_TO_FEE_KEY`-opslaget:
   ```typescript
   if (item.chosen_action === "send" && tier === "Lite" && item.mail_type === "brev") return "50 kr. + porto";
   ```

**`src/pages/TenantDashboard.tsx`**

2. **Dropdown-rækkefølge**: I alle Lite brev switch-cases, flyt `gratis_afhentning` til efter `afhentning`:
   ```
   Før:  ["gratis_afhentning", "scan", "standard_scan", "send", "standard_forsendelse", "afhentning"]
   Efter: ["scan", "standard_scan", "send", "standard_forsendelse", "afhentning", "gratis_afhentning"]
   ```

3. **Label**: Omdøb `afhentning` for Lite til "Hurtig afhentning":
   ```typescript
   if (action === "afhentning") return "Hurtig afhentning";
   ```

4. **Verificér gebyr-kolonne**: `getItemFee` linje 195-198 returnerer allerede "50 kr. + porto" for Lite `send` — bekræft at dette virker korrekt i alle scenarier (når `send` ikke er standardhandling).

