

## Problem

Brev 2976 har allerede en `confirmed` entry i `officernd_sync_log`. Edge-funktionen tjekker for `confirmed` eller `pending_confirmation` status og skipper automatisk — så et nyt kald vil bare returnere `{ skipped: true }`.

## Plan

### 1. Markér eksisterende confirmed-entry som superseded
Kør en database-migration der sætter den nuværende `confirmed` entry (id: `f08205ac-...`) til `superseded`, så idempotency-checket ikke blokerer.

### 2. Kald sync-officernd-charge manuelt
Invoke edge-funktionen med `{ "mail_item_id": "<uuid for brev 2976>" }` via curl.

### 3. Tjek edge function logs
Verificér i loggene at:
- Det korrekte team-member vælges (med `team`-felt)
- Gebyret oprettes under organisationen, ikke den personlige profil
- Status går til `pending_confirmation`

### 4. Vent på webhook-bekræftelse
Når OfficeRnD sender `fee.created` webhook, skal loggen opdateres til `confirmed`.

---

### Teknisk detalje
Det gamle gebyr (charge_id `69d50b54593604e7e8ec6057`) blev sandsynligvis oprettet under den forkerte member. Det nye gebyr vil oprette en **ekstra** charge i OfficeRnD — denne gang under det korrekte team-member. Det gamle gebyr bør slettes manuelt i OfficeRnD hvis det stadig eksisterer.

