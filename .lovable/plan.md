

## Tilføj rolle-filter (Lejere / Operatører) til Login Log

### Problem
Login log viser alle logins uden mulighed for at filtrere på brugertype.

### Løsning
Tilføj to radio buttons over søgefeltet: "Lejere" (default) og "Operatører". Filtreringen sker via en database-funktion, da `login_logs` ikke har en direkte relation til `user_roles`.

### Ændringer

**1. Database-migration: RPC-funktion til filtreret login-log**

Opret en `get_login_logs` funktion der joiner `login_logs` med `user_roles` og filtrerer på rolle:

```sql
CREATE OR REPLACE FUNCTION public.get_login_logs(
  _role text,
  _search text DEFAULT '',
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, user_id uuid, email text,
  logged_in_at timestamptz, last_seen_at timestamptz,
  total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.user_id, l.email, l.logged_in_at, l.last_seen_at,
    COUNT(*) OVER() AS total_count
  FROM login_logs l
  WHERE
    CASE WHEN _role = 'operator'
      THEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = l.user_id AND r.role = 'operator')
      ELSE NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = l.user_id AND r.role = 'operator')
    END
    AND (_search = '' OR l.email ILIKE '%' || _search || '%')
  ORDER BY l.logged_in_at DESC
  LIMIT _limit OFFSET _offset
$$;
```

**2. `src/components/LoginLogTab.tsx`**

- Tilføj state `roleFilter` med default `"tenant"`
- Tilføj `RadioGroup` med to `RadioGroupItem`: "Lejere" (`tenant`) og "Operatører" (`operator`)
- Placér radio buttons over søgefeltet
- Ændr query til at kalde `supabase.rpc("get_login_logs", { _role, _search, _limit, _offset })` i stedet for direkte tabelforespørgsel
- Inkludér `roleFilter` i queryKey så listen genindlæses ved skift

