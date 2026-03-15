

## Ny status "Sendt med DAO" for breve

### Problem
Når operatøren trykker "Send" på breve-fanen i "Send breve og pakker", ændres kun `chosen_action` til `under_forsendelse`. Der mangler en synlig statusændring til "Sendt med DAO" på begge sider.

### Ændringer

**1. Database-migration** — Tilføj `sendt_med_dao` til `mail_status` enum:
```sql
ALTER TYPE mail_status ADD VALUE 'sendt_med_dao';
```

**2. `src/pages/ShippingPrepPage.tsx`** — Opdater `sendMutation` til også at sætte `status: "sendt_med_dao"` når tab er `brev`:
```ts
.update({ chosen_action: "under_forsendelse", status: "sendt_med_dao" })
```
Kun for de breve der er checked. Pakker forbliver uændrede (kun `chosen_action`).

**3. Status-labels** — Tilføj `sendt_med_dao: "Sendt med DAO"` i følgende filer:
- `src/pages/OperatorDashboard.tsx` (STATUS_LABELS)
- `src/pages/TenantDashboard.tsx` (STATUS_LABELS)
- `src/components/MailItemLogSheet.tsx` (STATUS_LABELS)

**4. `src/lib/mailRowColor.ts`** — Tilføj farve-regel for `sendt_med_dao` (f.eks. blå/grøn tone).

**5. Operatør-query** — I `OperatorDashboard.tsx`, tilføj `sendt_med_dao` til status-filteret så forsendelser med denne status stadig vises korrekt (eller skjules fra aktiv-listen efter behov).

