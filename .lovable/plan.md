

## Fix: Lejer kan ikke se postmodtageres navn og email

### Problem
RLS-politikken på `profiles`-tabellen tillader kun:
1. Brugere at læse **deres egen** profil (`id = auth.uid()`)
2. Operatører at læse alle profiler

Når en lejer henter profiler for sine postmodtagere, blokerer RLS adgangen — de kan kun se deres egen profil, ikke de linkede brugeres profiler. Derfor vises "—" for navn og email.

### Løsning
Tilføj en ny RLS-politik der giver lejere adgang til at læse profiler for brugere, der er tilknyttet samme tenant via `tenant_users`-tabellen.

### Teknisk detalje
**1 ny migration** med følgende SQL:

```sql
CREATE POLICY "Tenants read co-tenant profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT tu.user_id FROM public.tenant_users tu
      WHERE tu.tenant_id IN (
        SELECT tu2.tenant_id FROM public.tenant_users tu2
        WHERE tu2.user_id = auth.uid()
      )
    )
    OR
    id IN (
      SELECT t.user_id FROM public.tenants t
      WHERE t.user_id = auth.uid()
    )
  );
```

Dette giver en lejer adgang til profiler for alle brugere, der deler en tenant med dem — præcis det der kræves for at vise postmodtagere korrekt.

Ingen kodeændringer nødvendige — UI'et henter allerede profildata korrekt, men RLS blokerer resultaterne.

