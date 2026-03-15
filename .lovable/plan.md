

## Fix: Pakker sendes med PostNord, ikke DAO

### Problem
Aktuelt sætter `sendMutation` kun `sendt_med_dao` for breve og intet for pakker. Pakker skal have deres egen status der afspejler at de sendes med PostNord.

### Ændringer

**1. Database-migration** — Tilføj `sendt_med_postnord` til `mail_status` enum:
```sql
ALTER TYPE mail_status ADD VALUE 'sendt_med_postnord';
```

**2. `src/pages/ShippingPrepPage.tsx`**
- Opdater `sendMutation` så pakker får `status: "sendt_med_postnord"`:
```typescript
const updatePayload = tab === "brev"
  ? { chosen_action: "under_forsendelse", status: "sendt_med_dao" as const }
  : { chosen_action: "under_forsendelse", status: "sendt_med_postnord" as const };
```
- Opdater toast til at vise korrekt transportør baseret på tab.
- Fix filtreringslogik (linje 234-236): brug `getNextShippingDateForItem(item.tenant_type_name, item.mail_type)` i stedet for hardcoded `("Lite", "brev")` så pakker vises korrekt.

**3. Status-labels** — Tilføj `sendt_med_postnord: "Sendt med PostNord"` i:
- `src/pages/OperatorDashboard.tsx`
- `src/pages/TenantDashboard.tsx`
- `src/components/MailItemLogSheet.tsx`

**4. `src/lib/mailRowColor.ts`** — Tilføj farveregel for `sendt_med_postnord` (samme teal-farve som DAO, eller en anden).

**5. Operatør- og lejer-dashboard** — Håndtér `sendt_med_postnord` på samme måde som `sendt_med_dao`:
- Vis "Sendt med PostNord [dato]" i status-kolonnen
- Inkludér i query-filter på operatør-side
- Lås handlinger på lejer-side (kun "Arkivér")
- Skjul annuller-knap

| Fil | Ændring |
|---|---|
| `ShippingPrepPage.tsx` | Pakker → `sendt_med_postnord`. Fix filtreringslogik. |
| `OperatorDashboard.tsx` | Query + status-display + kort-filter for ny status |
| `TenantDashboard.tsx` | Status-display + lås handlinger for ny status |
| `MailItemLogSheet.tsx` | Label for ny status |
| `mailRowColor.ts` | Farveregel for ny status |

