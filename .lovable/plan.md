

## Diagnose: OfficeRnD-sync kører ikke

### Årsag
Trigger-funktionen `notify_officernd_on_archive()` har **to fejl**:

1. **Manglende PostgreSQL-konfiguration**: Funktionen bruger `current_setting('app.settings.supabase_url', true)` og `current_setting('app.settings.service_role_key', true)`, men disse config-variabler er **aldrig sat** i databasen — de returnerer begge `NULL`. Derfor kan triggeren ikke konstruere URL'en til edge-funktionen.

2. **Forkert funktion-navn**: Funktionen kalder `extensions.http_post(...)`, men pg_net's HTTP-funktion hedder `net.http_post(...)` og har et andet parameter-format.

Resultatet er at triggeren fejler lydløst — den gør intet, og ingen sync-log oprettes.

### Løsning
Opdater trigger-funktionen til at bruge den korrekte `net.http_post`-signatur med hardcoded Supabase-URL (fra projektet) og hente service_role_key fra vault/secrets.

**Ny migration** der erstatter trigger-funktionen:

```sql
CREATE OR REPLACE FUNCTION public.notify_officernd_on_archive()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _enabled boolean;
  _supabase_url text := 'https://hokiuavxyoymcenqlvly.supabase.co';
  _service_role_key text;
BEGIN
  IF NEW.status <> 'arkiveret' THEN RETURN NEW; END IF;
  IF OLD.status = 'arkiveret' THEN RETURN NEW; END IF;

  SELECT enabled INTO _enabled FROM public.officernd_settings WHERE id = 1;
  IF NOT FOUND OR NOT _enabled THEN RETURN NEW; END IF;

  -- Get service role key from vault
  SELECT decrypted_secret INTO _service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  -- Use correct net.http_post signature
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/sync-officernd-charge',
    body := jsonb_build_object('mail_item_id', NEW.id)::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    )::jsonb
  );

  RETURN NEW;
END;
$function$;
```

### Ændringer
- **1 ny migration**: Erstatter trigger-funktionen med korrekt `net.http_post`-kald og henter service_role_key fra vault i stedet for en ikke-eksisterende PostgreSQL config-variabel.
- Ingen ændringer i frontend eller edge function kode.

