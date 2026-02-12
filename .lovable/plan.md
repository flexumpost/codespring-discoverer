
## Kobling af lejere til login-brugere

### Problem
Posten med forsendelsesnr. 2791 er korrekt tildelt lejeren "brugerfirma" i databasen, men lejeren kan ikke se den i sit dashboard. Arsagen er at **ingen lejere har en `user_id`** sat i `tenants`-tabellen. RLS-policyen bruger funktionen `my_tenant_ids()` som slaar op paa `user_id = auth.uid()` -- uden denne kobling returnerer den ingen resultater, og al post er usynlig for lejeren.

### Loesning
Tilfoej automatisk kobling mellem auth-brugere og tenants baseret paa email-match, samt mulighed for operatoeren at tildele manuelt.

### Trin

**1. Database-trigger: Auto-kobl bruger ved login**
Opret en database-funktion der koerer naar en bruger oprettes (via `handle_new_user` triggeren). Den matcher brugerens email mod `contact_email` i `tenants` og saetter `user_id` automatisk:

```sql
CREATE OR REPLACE FUNCTION public.link_user_to_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET user_id = NEW.id
  WHERE contact_email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_link_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_user_to_tenant();
```

**2. Ret eksisterende data**
Koer en engangs-opdatering for at koble eksisterende brugere til deres tenants:

```sql
UPDATE tenants t
SET user_id = u.id
FROM auth.users u
WHERE t.contact_email = u.email
  AND t.user_id IS NULL;
```

**3. Operatoer-felt i lejeroprettelse (RegisterMailDialog)**
Tilfoej et valgfrit felt saa operatoeren kan vaelge en eksisterende bruger ved oprettelse af ny lejer. Dette giver manuel kobling som backup naar email ikke matcher automatisk.

### Tekniske detaljer

**Fil: `supabase/migrations/` (ny migration)**
- Opretter `link_user_to_tenant()` funktionen
- Opretter trigger paa `auth.users`
- Koerer engangs-update for eksisterende data

**Fil: `src/components/RegisterMailDialog.tsx`**
- Ingen aendring paakraevet i foerste omgang -- auto-koblingen haandterer det

### Risici og overvejelser
- Triggeren rammer kun `auth.users` INSERT, ikke `tenants` INSERT. Hvis en lejer oprettes foer brugeren registrerer sig, vil triggeren fange det naar brugeren opretter sin konto
- Hvis `contact_email` er NULL eller ikke matcher, forbliver `user_id` NULL og lejeren kan ikke se post foer en operatoer manuelt kobler dem
- Loesningen kraever at operatoerer indtaster korrekt email ved lejeroprettelse
