

## Plan: Fix postmodtager-visning og multi-virksomheds-tilknytning

### Problem
Queries med `profiles(full_name, email)` nested i `tenant_users` fejler med `PGRST200` fordi der ikke er en foreign key relation mellem tabellerne.

### Ændring 1: Fix data-hentning (SettingsPage + TenantDetailPage)
Erstat nested select med to-trins hentning i begge filer:

```typescript
// Trin 1: Hent tenant_users
const { data: relations } = await supabase
  .from("tenant_users")
  .select("id, user_id")
  .eq("tenant_id", tenantId);

// Trin 2: Hent profiles separat
const userIds = relations?.map(r => r.user_id) ?? [];
if (userIds.length === 0) return [];
const { data: profiles } = await supabase
  .from("profiles")
  .select("id, full_name, email")
  .in("id", userIds);

// Trin 3: Merge
return relations.map(r => ({
  ...r,
  profile: profiles?.find(p => p.id === r.user_id),
}));
```

Opdater UI-referencerne fra `tu.profiles` til `tu.profile`.

### Ændring 2: Multi-virksomheds-tilknytning i oprettelsesdialog (SettingsPage)
- Tilføj en `useQuery` for at hente alle tenants ejeren har (via `useTenants` hook der allerede findes).
- I dialogen "Opret ny postmodtager": tilføj checkboxes for hver virksomhed ejeren har adgang til. Den aktuelle virksomhed er forhåndsvalgt.
- State: `selectedTenantIds: string[]` med default `[selectedTenantId]`.

### Ændring 3: Opdater edge function `create-tenant-user`
- Accepter `tenant_ids: string[]` (array) i stedet for enkelt `tenant_id`.
- Fald tilbage til `tenant_id` for bagudkompatibilitet.
- Verificer at kalderen ejer alle angivne tenants (eller er operator).
- Opret brugeren én gang, indsæt én `user_roles`-række, og indsæt en `tenant_users`-række per tenant.

### Ændring 4: Fix TenantDetailPage HTML-struktur
Postmodtager-kortet er aktuelt placeret forkert inde i forsendelsesadressen. Flyt det ud efter forsendelsesadressekortet i kolonne 1.

### Filer der ændres
1. `src/pages/SettingsPage.tsx` — fix query, tilføj multi-tenant checkboxes i dialog
2. `src/pages/TenantDetailPage.tsx` — fix query, fix HTML-struktur
3. `supabase/functions/create-tenant-user/index.ts` — accepter `tenant_ids` array

