

## Plan: Rediger postmodtagers virksomhedstilknytning

### Hvad ændres
Tilføj en "Rediger"-knap på hver postmodtager-kort i `SettingsPage.tsx`. Når ejeren klikker, åbnes en dialog med checkboxes for alle virksomheder. Ejeren kan til- og fravælge virksomheder for den pågældende postmodtager.

### Teknisk implementering

**Fil: `src/pages/SettingsPage.tsx`**

1. **Ny state**: `editingUser` (holder `user_id` og nuværende tilknytninger), `editDialogOpen`, `editTenantIds`.

2. **Ny query**: Når editDialog åbnes, hent alle `tenant_users`-rækker for den pågældende `user_id` på tværs af ejerens tenants — så vi ved hvilke virksomheder brugeren allerede er tilknyttet.

3. **Ny dialog**: Viser brugerens navn/email (read-only) og checkboxes for alle ejerens virksomheder. Forhåndsvalgte = de virksomheder brugeren allerede er tilknyttet.

4. **Gem-mutation**: Sammenlign valgte vs. eksisterende:
   - **Nye tilknytninger**: `INSERT INTO tenant_users` for tilføjede tenant_ids.
   - **Fjernede tilknytninger**: `DELETE FROM tenant_users` for fjernede tenant_ids.
   - Begge operationer kører direkte via Supabase SDK (ejeren har INSERT-rettigheder via eksisterende RLS-policy).

5. **RLS**: Ejeren mangler en DELETE-policy på `tenant_users`. Tilføj via migration:
```sql
CREATE POLICY "Tenant owners delete tenant_users" ON public.tenant_users
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()));
```

6. **UI**: Tilføj en `Pencil`-ikon-knap ved siden af slet-knappen på hvert postmodtager-kort (kun synlig for ejere med flere virksomheder).

### Filer der ændres
1. `src/pages/SettingsPage.tsx` — tilføj rediger-dialog og mutation
2. Database migration — tilføj DELETE-policy for tenant owners på `tenant_users`

