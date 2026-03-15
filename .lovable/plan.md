

## Fix: "Sendt med DAO" status-flow for breve

### Problemer identificeret

1. **Operatør-query** (linje 372) filtrerer kun `ny, afventer_handling, ulaest, laest` + destruer/arkiveret — `sendt_med_dao` er ikke inkluderet, så forsendelsen forsvinder.
2. **Operatør status-display** (`getOperatorStatusDisplay`) håndterer ikke `sendt_med_dao` status — falder igennem til forkert label.
3. **Operatør "Send"-kort tæller** tæller `sendt_med_dao` items med — skal ekskluderes fra tælleren men stadig vises i listen.
4. **Lejer status-display** (`getStatusDisplay`) håndterer ikke `sendt_med_dao` — viser forkert status.
5. **Lejer "Vælg handling"** viser stadig dropdown for `sendt_med_dao` items — skal kun vise "Arkivér".
6. **Lejer "Annuller handling"** viser stadig undo-knap — skal skjules.

### Ændringer

**1. `src/pages/OperatorDashboard.tsx`**

- **Query** (linje 372): Tilføj `sendt_med_dao` til status-filteret:
  ```
  .or("status.in.(ny,afventer_handling,ulaest,laest,sendt_med_dao),and(status.eq.arkiveret,chosen_action.eq.destruer)")
  ```
- **`getOperatorStatusDisplay`**: Tilføj case for `status === "sendt_med_dao"` der returnerer `"Sendt med DAO [dato]"` med `updated_at` som dato.
- **"Send"-kort `countFilter`**: Ekskludér items med `status === "sendt_med_dao"` fra tælleren (allerede OK da countFilter kun matcher `chosen_action === "send"`). Men `filter` (listen) skal inkludere `sendt_med_dao` items: tilføj `item.status === "sendt_med_dao"` til Send-kortets filter.

**2. `src/pages/TenantDashboard.tsx`**

- **`getStatusDisplay`**: Tilføj case øverst for `item.status === "sendt_med_dao"` der returnerer `["Sendt med DAO", dato]`.
- **"Vælg handling" kolonne** (linje ~800-876): Hvis `item.status === "sendt_med_dao"`, vis kun "Arkivér"-knap.
- **"Annuller handling" kolonne** (linje ~878-890): Skjul undo-knap for `sendt_med_dao` items.
- **Default liste-query** (linje 501): `neq("status", "arkiveret")` — dette inkluderer allerede `sendt_med_dao`, så items vises korrekt.

**3. `src/pages/ShippingPrepPage.tsx`**

- Opdater toast-besked til "Forsendelser sendt med DAO" i stedet for "markeret som Under forsendelse".

| Fil | Ændring |
|---|---|
| `src/pages/OperatorDashboard.tsx` | Query: tilføj `sendt_med_dao`. Status-display: tilføj case. Send-kort filter: inkludér `sendt_med_dao`. |
| `src/pages/TenantDashboard.tsx` | Status-display: tilføj case. Vælg handling: vis kun Arkivér. Annuller: skjul. |
| `src/pages/ShippingPrepPage.tsx` | Opdater toast-besked. |

