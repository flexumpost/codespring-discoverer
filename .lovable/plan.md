

## Plan: Fix postmodtagere visibility

### Problem 1: RLS policy on `tenant_users` blocks tenant owners
The current SELECT policy on `tenant_users` is:
```
(user_id = auth.uid()) OR is_operator()
```
This means a tenant owner can only see rows where **they** are the `user_id`. When they query for postmodtagere linked to their tenant, the new users' rows are invisible because `user_id` is the **new user's** ID.

**Fix**: Update the RLS SELECT policy to also allow tenant owners to see all `tenant_users` rows for their tenants:
```sql
DROP POLICY "Users read own tenant_users" ON public.tenant_users;
CREATE POLICY "Users read own tenant_users" ON public.tenant_users
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_operator()
    OR tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );
```

### Problem 2: Operator's TenantDetailPage doesn't show postmodtagere
The `TenantDetailPage.tsx` has no query or UI for `tenant_users`. Postmodtagere are only shown on the tenant's SettingsPage.

**Fix**: Add a `useQuery` for `tenant_users` (with `profiles` join) to `TenantDetailPage.tsx` and display them in cards below the contact information section, similar to the SettingsPage layout.

### Summary of changes
1. **Database migration**: Update `tenant_users` SELECT RLS policy
2. **`src/pages/TenantDetailPage.tsx`**: Add tenant_users query and display cards with postmodtager info (name, email)

