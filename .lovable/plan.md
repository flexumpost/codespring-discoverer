

## Automatisk kobling af nye tenants til eksisterende brugere

### Problem

Triggeren `on_auth_user_created_link_tenant` kører kun ved oprettelse af nye brugere (`AFTER INSERT ON auth.users`). Når en operator opretter en ny tenant med en `contact_email` der allerede tilhører en eksisterende bruger, sættes `user_id` ikke.

### Løsning

Tilføj en trigger på `tenants`-tabellen der kører ved INSERT og UPDATE, og matcher `contact_email` mod `auth.users.email` for at sætte `user_id`.

### Ændringer

| Ændring | Detalje |
|---|---|
| **Database-migration** | Opret funktion `link_tenant_to_user()` + trigger på `tenants` tabellen |
| **Engangsopdatering** | Kør UPDATE for at koble eksisterende tenants med `user_id IS NULL` til brugere via email |

### SQL

```sql
-- Funktion: Når en tenant oprettes/opdateres, find bruger via email
CREATE OR REPLACE FUNCTION public.link_tenant_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contact_email IS NOT NULL THEN
    SELECT id INTO NEW.user_id
    FROM auth.users
    WHERE email = NEW.contact_email
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger på tenants ved INSERT og UPDATE af contact_email
CREATE TRIGGER on_tenant_upsert_link_user
  BEFORE INSERT OR UPDATE OF contact_email ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.link_tenant_to_user();

-- Ret eksisterende data
UPDATE public.tenants t
SET user_id = u.id
FROM auth.users u
WHERE t.contact_email = u.email
  AND t.user_id IS NULL;
```

Ingen kodeændringer nødvendige -- `useTenants` og `my_tenant_ids()` bruger allerede `user_id`, så når `user_id` sættes korrekt, vil begge virksomheder automatisk vises.

