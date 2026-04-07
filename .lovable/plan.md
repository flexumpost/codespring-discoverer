

## Problem: Forkert gebyr for brev 9855

### Analyse
- Brev 9855: `mail_type=brev`, `chosen_action=scan`, `tier=Standard` → korrekt gebyr er **30 kr.** med plan **"Scanning af brev (Standard)"**
- Men sync_log har en `confirmed` entry fra vores test-session kl. 15:12 med forkert plan ("Brev/pakke afhentning (Lite)") og forkert beløb (50 kr.)
- Den forkerte entry blev oprettet med en ældre version af koden, før plan-mapping blev rettet
- Når scan-upload-triggeren fyrer, finder idempotency-checket den eksisterende `confirmed` entry og springer over

### Plan

**Trin 1: Markér den forkerte entry som `superseded`**
- Opdatér `officernd_sync_log` for mail_item_id `d4d1a689-555b-4d25-978a-1a93a80200c0` fra `confirmed` til `superseded`

**Trin 2: Slet det forkerte gebyr i OfficeRnD**
- Brugeren skal manuelt slette charge `69d51ed76f3c6a33a5492e50` i OfficeRnD (da det har forkert beløb)

**Trin 3: Kør sync igen**
- Kald `sync-officernd-charge` med mail_item_id for at oprette et nyt gebyr med korrekt plan og beløb

**Trin 4: Verificér**
- Tjek at ny sync_log entry viser plan "Scanning af brev (Standard)" og beløb "30 kr."
- Tjek at charge_id er udfyldt

