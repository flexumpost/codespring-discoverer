

## Realtime opdatering af "Ubetalt faktura" på lejer-siden

### Problem
Når operatøren ændrer `has_unpaid_invoice` på en lejer, ser lejeren først ændringen efter en side-refresh, fordi `useTenants`-hooket kun henter data én gang via react-query.

### Løsning
Tilføj `tenants`-tabellen til Supabase Realtime og abonnér på ændringer i `useTenants`-hooket, så react-query's cache invalideres automatisk.

### Ændringer

**1. Database-migration**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
```

**2. `src/hooks/useTenants.tsx`**
- Importér `useEffect` og `useQueryClient` fra react-query.
- Tilføj en `useEffect` der opretter en Supabase Realtime-kanal på `tenants`-tabellen (lytter på `UPDATE`-events).
- Når en ændring modtages, kald `queryClient.invalidateQueries({ queryKey: ["my-tenants"] })` for at genindlæse data.
- Cleanup: unsubscribe ved unmount.

