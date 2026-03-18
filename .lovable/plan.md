

## Plan: Tilføj "Email Log" tab til operatør-indstillinger

### Oversigt
Tilføj en ny "Email Log" fane under operatør-indstillinger, der viser en liste over alle sendte emails fra systemet (nyeste først), med status-badges for levering.

### Ændringer

**1. Ny komponent: `src/components/EmailLogTab.tsx`**
- Henter data fra `email_send_log` via en backend-funktion (da tabellen kun er tilgængelig for `service_role`)
- Viser en tabel med kolonner: Dato, Template, Modtager, Status
- Sorteret med nyeste først (`created_at DESC`)
- Deduplikeret på `message_id` (viser kun seneste status per email)
- Status-badges med farver: grøn=sent, rød=failed/dlq, gul=pending
- Simpel pagination (50 per side)

**2. Ny Edge Function: `supabase/functions/get-email-log/index.ts`**
- Verificerer at kalderen er operatør
- Henter deduplikerede email logs med service role
- Returnerer sorteret liste med pagination-support (offset/limit)

**3. Opdater `src/components/OperatorSettingsTabs.tsx`**
- Tilføj ny tab "Email Log" med `EmailLogTab` komponent

### Bemærkning om levering/åbning
`email_send_log` gemmer status som `sent`, `failed`, `dlq`, `pending` osv. Resend API'et understøtter webhooks for delivery og open events, men det kræver opsætning af en webhook-endpoint. I første omgang viser vi den status vi har (`sent`/`failed`/`pending`). Delivery- og open-tracking kan tilføjes senere via Resend webhooks.

### Filer der oprettes/ændres
- `supabase/functions/get-email-log/index.ts` — ny
- `src/components/EmailLogTab.tsx` — ny
- `src/components/OperatorSettingsTabs.tsx` — tilføj tab

