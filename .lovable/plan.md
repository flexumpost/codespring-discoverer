# Fix: Dobbelt shipment-email til M.O.D

## Årsag
M.O.D's `tenants.contact_email` = `Pedersenlottepedersen@gmail.com` (stort P).
Profilen i `tenant_users → profiles.email` = `pedersenlottepedersen@gmail.com` (lille p).

I `supabase/functions/send-new-mail-email/index.ts` filtreres ekstra modtagere case-sensitivt:
```ts
if (p.email && p.email !== tenant.contact_email) {
  extraEmails.push(p.email);
}
```
Da strengene ikke matcher pga. casing, ryger profilen ind som "ekstra modtager", og samme person modtager mailen to gange. Bekræftet i `email_send_log` (én normal afsendelse + én med `extra_recipient: true`, begge til samme adresse i forskellig casing).

## Ændringer

### 1. `supabase/functions/send-new-mail-email/index.ts`
Gør filtreringen case-insensitiv og deduplikér også internt blandt profiler:
```ts
const primaryLower = tenant.contact_email.toLowerCase();
const seen = new Set<string>([primaryLower]);
for (const p of profiles) {
  if (!p.email) continue;
  const lower = p.email.toLowerCase();
  if (seen.has(lower)) continue;
  seen.add(lower);
  extraEmails.push(p.email);
}
```
Genudrul edge function.

### 2. Tjek øvrige steder (kun læse-tjek, ingen ændring medmindre nødvendigt)
Hurtig `rg` for tilsvarende `!== tenant.contact_email`-mønstre i andre edge functions (fx `send-welcome-email`, notify-* funktioner). Hvis samme bug findes, anvendes samme fix der.

## Out of scope
- Ingen normalisering/lowercase af eksisterende `contact_email`-data i databasen (kan gøres separat hvis ønsket).
- Ingen UI-ændringer.

## Verifikation
- Send en test-forsendelse til M.O.D og bekræft kun ét row i `email_send_log` for `shipment_dispatched`.
