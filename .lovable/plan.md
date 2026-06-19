## Problem

`BulkUploadPage.tsx`'s `handleSaveAll` indsætter `mail_items` direkte, men kalder aldrig edge-funktionen `send-new-mail-email`. Til sammenligning kalder både `RegisterMailDialog.tsx` (linje 531-540) og `OperatorDashboard.tsx` (linje 664) `supabase.functions.invoke("send-new-mail-email", {...})` efter hver insert. Derfor blev der ingen "ny post"-mails sendt til lejerne ved den seneste bulk-upload, og `email_send_log` indeholder ingen rækker for de pågældende forsendelser.

## Løsning

I `src/pages/BulkUploadPage.tsx`, inde i `handleSaveAll`-løkken efter en succesfuld `mail_items.insert`:

```ts
supabase.functions.invoke("send-new-mail-email", {
  body: {
    tenant_id: item.tenantId,
    mail_type: item.mailType,
    stamp_number: item.stampNumber ? parseInt(item.stampNumber, 10) : null,
    is_new_tenant: false,
  },
}).catch((err) => console.error("send-new-mail-email failed:", err));
```

- Fire-and-forget (samme mønster som `RegisterMailDialog`) så bulk-flow ikke bliver langsomt eller stopper, hvis én mail fejler.
- Kører kun når `item.tenantId` er sat (allerede garanteret af `validItems`-filteret).
- `is_new_tenant: false` — bulk-flow understøtter ikke inline-tenant-oprettelse.

## Bemærkning om allerede uploadede forsendelser

Den bulk-upload du lige har lavet har ikke trigget mails. Hvis du ønsker, kan jeg som et separat skridt køre `send-new-mail-email` manuelt for de berørte `mail_items` (efter id eller tidsinterval), så lejerne stadig får besked. Sig til hvis du vil have det med.

## Filer

- `src/pages/BulkUploadPage.tsx` (én tilføjelse i save-løkken)
