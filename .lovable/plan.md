

## Fix: Operatør-notifikation ved destruktions-anmodning

### Problem
Der findes ingen trigger der notificerer operatører når en lejer vælger "destruer" som handling. Kun scan-anmodninger har denne notifikation (via `notify_operator_on_scan_request` og `notify_operator_on_scan_request_insert`).

### Løsning
Tilføj to nye triggers — en for UPDATE og en for INSERT — der sender notifikation til alle operatører når `chosen_action` sættes til `destruer`.

### Ændring

**Database migration** med to funktioner og triggers:

1. **`notify_operator_on_destruction_request()`** — BEFORE UPDATE trigger
   - Checker om `NEW.chosen_action = 'destruer'` og `OLD.chosen_action != 'destruer'`
   - Indsætter notifikation til alle operatører med titel "Destruktions-anmodning"
   - SECURITY DEFINER for at læse `user_roles`

2. **`notify_operator_on_destruction_request_insert()`** — AFTER INSERT trigger
   - Checker om `NEW.chosen_action = 'destruer'` (for tilfælde hvor standardhandling er destruktion)
   - Samme notifikationslogik

Begge følger præcis samme mønster som de eksisterende scan-notifikationstriggers.

### Tekniske detaljer

```sql
-- UPDATE trigger (tenant ændrer handling til destruer)
CREATE OR REPLACE FUNCTION public.notify_operator_on_destruction_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ ... $$;

CREATE TRIGGER trg_notify_operator_on_destruction_request
  BEFORE UPDATE ON public.mail_items
  FOR EACH ROW EXECUTE FUNCTION notify_operator_on_destruction_request();

-- INSERT trigger (standardhandling = destruer)
CREATE OR REPLACE FUNCTION public.notify_operator_on_destruction_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ ... $$;

CREATE TRIGGER trg_notify_operator_on_destruction_request_insert
  AFTER INSERT ON public.mail_items
  FOR EACH ROW EXECUTE FUNCTION notify_operator_on_destruction_request_insert();
```

Ingen frontend-ændringer nødvendige.

