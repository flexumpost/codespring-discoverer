

## Webhook-endpoint: OfficeRnD fee.created bekræftelse

### Formål
Når vi opretter et gebyr via `POST /fees` i OfficeRnD, logger vi det som "success" — men vi har set tilfælde hvor gebyret ikke faktisk blev oprettet. Et webhook-endpoint lader OfficeRnD bekræfte oprettelsen ved at sende en `fee.created`-event tilbage til os, så vi kan opdatere sync-loggen med det rigtige `charge_id`.

### Flow
```text
1. sync-officernd-charge → POST /fees → logger "pending" i sync_log
2. OfficeRnD opretter gebyret → sender webhook POST til vores endpoint
3. Vores endpoint matcher mail_item_id og opdaterer sync_log med charge_id + status "confirmed"
```

### Ændringer

**1. Ny Edge Function: `supabase/functions/officernd-webhook/index.ts`**
- Modtager POST fra OfficeRnD med fee.created payload
- Validerer en webhook-secret (shared token) for at sikre at kaldet er ægte
- Udtrækker fee-id og description (som indeholder mail_item reference)
- Finder den matchende `officernd_sync_log`-entry via description-parsing eller et metadata-felt
- Opdaterer loggen: `status = "confirmed"`, `charge_id = <rigtigt OfficeRnD fee._id>`

**2. Ændring i `sync-officernd-charge/index.ts`**
- Skift succes-status fra `"success"` til `"pending_confirmation"` efter POST /fees
- Gem det returnerede fee-id (hvis tilgængeligt) som foreløbigt charge_id
- Tilføj `mail_item_id` i charge-description/name, så webhook kan matche den tilbage

**3. Ny secret: `OFFICERND_WEBHOOK_SECRET`**
- Et shared token som sættes i både OfficeRnD webhook-konfigurationen og vores edge function
- Bruges til at verificere at webhook-kaldet er ægte

### OfficeRnD-opsætning (manuelt)
Brugeren skal oprette en webhook i OfficeRnD-dashboardet:
- **URL**: `https://hokiuavxyoymcenqlvly.supabase.co/functions/v1/officernd-webhook`
- **Event**: `fee.created`
- **Secret/Token**: Samme værdi som `OFFICERND_WEBHOOK_SECRET`

### Database
Ingen skemaændringer nødvendige — `officernd_sync_log` har allerede `status` og `charge_id` felter. Vi tilføjer blot en ny status-værdi `"confirmed"`.

### Teknisk detalje
OfficeRnD webhook-payloads indeholder typisk det oprettede objekt. Vi matcher via description-feltet som allerede indeholder mail_item_id-referencen (f.eks. `"Postgebyr: 50 kr. (brev)"`). For mere robust matching tilføjer vi mail_item_id i description.

