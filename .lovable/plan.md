

## Diagnose: Notifikationen blev faktisk sendt

### Resultat af undersøgelse
Jeg har kontrolleret database for forsendelse 3059 (Sonder IP ApS, mail_item_id `4b87d973...`):

- ✅ `chosen_action = 'scan'` blev korrekt sat ved INSERT (via `apply_tenant_default_action`)
- ✅ INSERT-trigger `trg_notify_operator_on_scan_request_insert` kørte
- ✅ **3 notifikationsrækker blev oprettet** kl. 06:12 — én til hver operatør:
  - rico@flexum.dk ✅
  - rico.davidsen12@gmail.com ✅
  - emilie@flexum.dk ✅
- ✅ Notifikationen er øverst i din liste og stadig `is_read = false`
- ✅ Realtime-publication er aktiv på `notifications`-tabellen

**Notifikationen er altså i systemet og blev leveret til din bell.** Problemet er ikke trigger-logikken (den fix vi lavede 2026-04-16 virker).

### Sandsynlige årsager til at du ikke "fik" den

1. **Ingen email/push-notifikation** — `NotificationBell` viser kun en in-app badge. Hvis du ikke havde appen åben, ser du den først ved næste page load. Der er pt. ingen email til operatører ved scan-anmodninger.
2. **Realtime-channel disconnected** — hvis browser-fanen lå længe inaktiv, kan WebSocket-channel'en være droppet, så badge-tælleren ikke opdaterede live (kræver page refresh).
3. **Bell'en blev overset** — du har 15+ ulæste notifikationer i forvejen, så badge-tælleren stiger ikke synligt fra fx "14" til "15".

### Forslag til løsning

Jeg foreslår at sende **email til operatører** ved scan-anmodninger (parallelt til in-app), præcis som `notify-scan-request` Edge Function allerede er bygget til — men den kaldes pt. ikke fra triggeren.

**Ændringer:**

1. **Database-trigger-funktioner** (`notify_operator_on_scan_request` + `_insert`)
   - Efter at have indsat in-app notifikationer, kald `notify-scan-request` Edge Function via `pg_net.http_post` med service-role key (samme mønster som `notify_officernd_on_archive`)
   - Sender én email til kontakt@flexum.dk per scan-anmodning

2. **Edge Function `notify-scan-request/index.ts`**
   - Tilpas den til at acceptere kald fra service_role (i dag kræver den en bruger-JWT via `callerClient.from('mail_items')`)
   - Skift til `supabaseAdmin` til at hente mail_item når kaldt fra trigger

Ingen frontend-ændringer.

### Alternativ (hvis du ikke vil have emails)

Forbedre realtime-robusthed i `NotificationBell`:
- Tilføj heartbeat/reconnect-logik til channel
- Vis toast pop-up ved nye notifikationer (ikke kun badge-tæller)

