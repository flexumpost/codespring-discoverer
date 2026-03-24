

## Problem

When an operator changes a tenant's `contact_email` on the detail page (`/tenants/:id`), the `contactMutation` only updates the `tenants` table. It does NOT:
1. Create a new auth user for the new email address
2. Link the new user to the tenant via `tenant_users`
3. Send an invitation/welcome email to the new address

This is unlike tenant creation on `TenantsPage`, which calls `create-tenant-user` with `mode: "invite"` after inserting the tenant.

## Fix

**File: `src/pages/TenantDetailPage.tsx`** — Extend `contactMutation.onSuccess`

After saving the contact info, check if the email actually changed (compare new value to `tenant.contact_email`). If it did and the new email is non-empty:

1. Call `create-tenant-user` edge function with the new email, tenant ID, and `mode: "invite"` — this will:
   - Create a new auth user (or find existing)
   - Link them via `tenant_users`
   - Send the branded invitation email
   - Set `user_id` on the tenant if it was null
2. Show a success toast confirming the invitation was sent
3. Invalidate the `tenant-users` query to refresh the Postmodtagere list
4. If the call fails, show an error toast but keep the contact info save (which already succeeded)

The old tenant_user link is intentionally kept — the previous user may still need access (e.g., if this is a secondary contact change). The operator can manually remove old users if needed.

### Code Change (contactMutation onSuccess)

```typescript
onSuccess: async () => {
  queryClient.invalidateQueries({ queryKey: ["tenant-detail", id] });
  toast.success(t("tenantDetail.contactInfoSaved"));

  // If email changed, create user + send invitation
  const oldEmail = tenant?.contact_email ?? "";
  const newEmail = contactEmail.trim();
  if (newEmail && newEmail.toLowerCase() !== oldEmail.toLowerCase()) {
    try {
      const { error } = await supabase.functions.invoke("create-tenant-user", {
        body: {
          email: newEmail,
          first_name: contactFirstName.trim() || tenant?.company_name || "",
          last_name: contactLastName.trim() || "",
          tenant_ids: [id],
          mode: "invite",
        },
      });
      if (error) throw error;
      toast.success(t("tenants.welcomeEmailSent", { email: newEmail }));
      queryClient.invalidateQueries({ queryKey: ["tenant-users", id] });
    } catch (err: any) {
      toast.error(t("tenants.couldNotCreateUser") + ": " + (err?.message || err));
    }
  }
},
```

This reuses the exact same invitation flow as tenant creation, ensuring the new email gets a proper auth user, tenant link, and welcome email.

