

## Kør gebyr for brev 2976 igen

### Problem
Funktionen har en idempotency-check (linje 180-190) der automatisk springer over hvis der allerede findes en `confirmed` eller `pending_confirmation` entry for dette mail_item_id. Den nuværende entry er `confirmed`, så funktionen returnerer `skipped: true`.

### Plan

**Trin 1: Markér eksisterende confirmed-entry som superseded**

Kør en SQL-migration der opdaterer den eksisterende confirmed log-entry:
```sql
UPDATE officernd_sync_log 
SET status = 'superseded' 
WHERE mail_item_id = 'd8338128-3a2b-43e7-b660-f79781a8bf82' 
  AND status = 'confirmed';
```

**Trin 2: Kald sync-officernd-charge igen**

Kald Edge Function med `POST /sync-officernd-charge` og body `{"mail_item_id":"d8338128-3a2b-43e7-b660-f79781a8bf82"}`.

**Trin 3: Verificér resultatet**

Tjek sync_log for ny entry med `pending_confirmation` eller `confirmed` status, og verificér at `charge_id` er udfyldt.

### Bemærkning
Husk at slette de gamle dublet-gebyrer i OfficeRnD manuelt (`69d50b54...`, `69d51284...`, `69d51837...`, `69d51cc3...`) efter den nye er verificeret.

