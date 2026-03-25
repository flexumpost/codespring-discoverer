

## Problem

E-mailnotifikationer (ny post, scanning klar, forsendelse afsendt osv.) sendes kun til `tenant.contact_email`. Sekundære postmodtagere i `tenant_users`-tabellen modtager in-app notifikationer, men ingen e-mails.

## Løsning

Udvid `send-new-mail-email` Edge Function til at sende til alle tilknyttede brugere (via `tenant_users` → `profiles`) ud over kontaktpersonen. Undlad welcome-flow for ekstra modtagere (kun kontaktpersonen får magic-link).

### Ændringer

**1. `supabase/functions/send-new-mail-email/index.ts`**

Efter at have hentet tenant-data (linje 84-88), hent alle tilknyttede brugere:

```typescript
// Hent alle tenant_users' emails via profiles
const { data: tenantUsers } = await supabaseAdmin
  .from("tenant_users")
  .select("user_id")
  .eq("tenant_id", tenant_id);

const extraEmails: string[] = [];
if (tenantUsers?.length) {
  const userIds = tenantUsers.map(tu => tu.user_id);
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .in("id", userIds);
  if (profiles) {
    for (const p of profiles) {
      if (p.email && p.email !== tenant.contact_email) {
        extraEmails.push(p.email);
      }
    }
  }
}
```

Derefter, efter at have sendt til kontaktpersonen (linje 190-217), send **samme e-mail** (med `NewShipmentEmail`-template, ikke welcome-template) til hver ekstra modtager:

```typescript
// Send til ekstra postmodtagere (ikke welcome-flow)
for (const email of extraEmails) {
  const extraHtml = await renderAsync(
    slug === "shipment_dispatched"
      ? ShipmentDispatchedEmail({ name, subject, bodyHtml, loginUrl, ... })
      : NewShipmentEmail({ name, subject, bodyHtml, loginUrl })
  );
  
  const extraRes = await fetch("https://api.resend.com/emails", { ... to: [email] ... });
  // Log each send
  await supabaseAdmin.from("email_send_log").insert({ ... recipient_email: email ... });
}
```

Vigtige detaljer:
- Welcome/magic-link flow (`is_new_tenant`) sendes **kun** til kontaktpersonen — ekstra modtagere får standard `NewShipmentEmail`.
- Duplikater filtreres fra (kontaktpersonens email springes over i `extraEmails`).
- Hver afsendelse logges separat i `email_send_log`.
- Fejl i en ekstra afsendelse logger en advarsel men stopper ikke de øvrige.

### Ingen database-ændringer påkrævet

`tenant_users` og `profiles` tabellerne eksisterer allerede med de nødvendige data. Service-role klienten bruges, så RLS er ikke en begrænsning.

