

## Plan: Vis postmodtagere under kontaktoplysninger med slet-funktion

### Overblik
Efter oprettelse af en postmodtager skal denne vises i et kort under "Kontaktoplysninger". Kun default-brugeren (tenant-ejeren, dvs. `tenants.user_id`) kan slette postmodtagere.

### 1. `src/pages/SettingsPage.tsx`

**Hent postmodtagere:**
- Tilføj en `useQuery` der henter `tenant_users` for den valgte tenant, joinet med `profiles` for at få navn og email:
```typescript
const { data: tenantUsers } = useQuery({
  queryKey: ["tenant-users", selectedTenantId],
  enabled: !!selectedTenantId,
  queryFn: async () => {
    const { data } = await supabase
      .from("tenant_users")
      .select("id, user_id, profiles(full_name, email)")
      .eq("tenant_id", selectedTenantId!);
    return data ?? [];
  },
});
```

**Vis postmodtagere i kort:**
- Under "Kontaktoplysninger"-kortet, vis et kort per postmodtager med navn og email.
- Vis en "Slet bruger"-knap kun hvis den aktuelle bruger er default-ejeren (`user.id === selectedTenant.user_id`).

**Slet-mutation:**
- Kald en ny edge function `delete-tenant-user` der sletter brugeren fra `tenant_users`, `user_roles` og `auth.users`.
- Invalider `tenant-users` query ved success.

### 2. Ny edge function: `supabase/functions/delete-tenant-user/index.ts`

- Modtager `tenant_user_id` (ID fra `tenant_users`-tabellen).
- Verificerer at kalderen er ejer af den pågældende tenant (`tenants.user_id = caller_id`).
- Henter `user_id` fra `tenant_users`-rækken.
- Sletter `tenant_users`-rækken, `user_roles`-rækken og auth-brugeren via admin API.
- Returnerer success.

Skal registreres i `supabase/config.toml` med `verify_jwt = false`.

### 3. Ingen databaseændringer
`tenant_users` og `profiles` tabellerne eksisterer allerede med korrekte RLS-policies. `profiles` har SELECT for alle authenticated brugere.

### Resultat
- Postmodtagere vises i individuelle kort under kontaktoplysninger
- Kun default-brugeren ser "Slet bruger"-knappen
- Sletning fjerner brugeren helt fra systemet

