

## Track & Trace for pakker

### Ændringer

**1. Database-migration** — Tilføj `tracking_number` kolonne til `mail_items`:
```sql
ALTER TABLE public.mail_items ADD COLUMN tracking_number text;
```

**2. `src/pages/ShippingPrepPage.tsx`**
- Tilføj state `trackingNumbers: Record<string, string>` til at holde track & trace numre per item.
- I hver pakke-linje (linje 480-492), tilføj et `<Input>` felt til højre for teksten, kun synligt på pakke-tab.
- I `sendMutation`: for pakker, opdater hvert item individuelt med dets `tracking_number` fra state (i stedet for batch `.in("id", ids)`).

**3. `src/pages/TenantDashboard.tsx`**
- I status-kolonnen: når `item.status === "sendt_med_postnord"` og `item.tracking_number` eksisterer, vis en "Spor pakken"-knap der åbner `https://tracking.postnord.com/da/tracking?id={tracking_number}` i nyt vindue.

**4. `src/integrations/supabase/types.ts`** — Opdateres automatisk efter migration.

| Fil | Ændring |
|---|---|
| Migration | Tilføj `tracking_number text` kolonne |
| `ShippingPrepPage.tsx` | Input-felt for tracking-nummer på pakkelinjer, gem ved send |
| `TenantDashboard.tsx` | "Spor pakken"-knap når pakke er sendt med PostNord |

