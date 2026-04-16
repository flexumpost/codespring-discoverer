

## Fix: Scan-notifikation ved oprettelse af post

### Problem
`notify_operator_on_scan_request` er kun en UPDATE-trigger. Når `apply_tenant_default_action` sætter `chosen_action = 'scan'` på INSERT, sendes ingen notifikation til operatøren.

### Løsning
Tilføj en ny AFTER INSERT trigger der sender scan-notifikation når `chosen_action = 'scan'` allerede er sat ved oprettelse.

### Ændring

**1. Database migration**

Ny funktion `notify_operator_on_scan_request_insert()`:
- Fires AFTER INSERT on `mail_items`
- Checker om `NEW.chosen_action = 'scan'`
- Hvis ja: indsætter notifikation til alle operatører (samme logik som den eksisterende UPDATE-trigger)
- SECURITY DEFINER for at kunne læse `user_roles`

```sql
CREATE OR REPLACE FUNCTION public.notify_operator_on_scan_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _op record; _stamp text;
BEGIN
  IF NEW.chosen_action IS DISTINCT FROM 'scan' THEN RETURN NEW; END IF;
  _stamp := CASE WHEN NEW.stamp_number IS NOT NULL 
    THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END;
  FOR _op IN SELECT user_id FROM user_roles WHERE role = 'operator' LOOP
    INSERT INTO notifications (user_id, mail_item_id, title, message)
    VALUES (_op.user_id, NEW.id, 'Scan-anmodning',
      'En lejer har anmodet om scanning af forsendelse' || _stamp || '.');
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_operator_on_scan_request_insert
  AFTER INSERT ON public.mail_items
  FOR EACH ROW EXECUTE FUNCTION notify_operator_on_scan_request_insert();
```

Ingen frontend-ændringer nødvendige.

