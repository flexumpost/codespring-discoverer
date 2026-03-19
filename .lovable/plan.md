

## Problem

When an operator creates a new tenant **and** registers mail in the same flow, two separate emails are sent:
1. An **invitation email** (via `create-tenant-user` → `inviteUserByEmail`) with "Sæt din adgangskode" button
2. A **new shipment email** (via `send-new-mail-email`) with "Se din post" button

The tenant clicks "Se din post", gets redirected to login, but has no password yet — and misses the invitation email.

## Solution

Create a combined "welcome + new mail" email that is sent **instead of** both emails when a tenant is brand new (just created in the same flow). This single email has:
- Subject/heading: "Du har ny forsendelse i din nye postkasse"
- Body explaining they have a new mailbox AND a new shipment
- A single CTA: "Sæt din adgangskode →" (links to the password-setup recovery URL)

### Changes

**1. New email template: `supabase/functions/_shared/email-templates/welcome-shipment.tsx`**

A combined template similar to `invite.tsx` but with shipment context. Includes:
- Flexum logo
- Heading: "Du har ny forsendelse i din nye postkasse"
- Text explaining: new mailbox + new shipment received
- Dynamic body from the `email_templates` table (slug `welcome_shipment`)
- "Sæt din adgangskode →" button linking to `confirmationUrl` (recovery link)
- Footer

**2. New email template row in `email_templates` table (migration)**

Insert a new template with slug `welcome_shipment`:
- Subject: `Du har ny forsendelse i din nye postkasse`
- Body: `Hej {{name}},\n\nDin virksomhed {{company_name}} har fået en postkasse hos Flexum Coworking.\n\nDer er allerede registreret en ny {{mail_type}} til dig (nr. {{stamp_number}}).\n\nKlik nedenfor for at sætte din adgangskode og se din post.`
- Audience: `tenant`

**3. Update `supabase/functions/send-new-mail-email/index.ts`**

Add a new optional parameter `is_new_tenant` to the request body. When `true`:
- Generate a password recovery link for the tenant's user via `adminClient.auth.admin.generateLink({ type: 'recovery', ... })` with redirect to `/set-password`
- Use the `welcome_shipment` template slug instead of `new_shipment`
- Render using the new `WelcomeShipmentEmail` template (passing `confirmationUrl`)
- This replaces both the invitation and new-shipment emails

**4. Update `src/components/RegisterMailDialog.tsx`**

In `handleSubmit` (around line 507): detect if the tenant was just created in this session (track via a `newlyCreatedTenantId` state variable set in `handleCreateTenant`). If so:
- Pass `is_new_tenant: true` to `send-new-mail-email`
- Skip the separate invitation email by **not** calling `create-tenant-user` with `mode: "invite"` during `handleCreateTenant` when email is provided. Instead, only create the user account (still via `create-tenant-user` with `mode: "invite"`) but suppress the default Supabase invite email, and defer the combined email to `handleSubmit`.

Wait — the invitation is sent by Supabase's `inviteUserByEmail` which auto-sends. We can't easily suppress it. 

**Revised approach for step 4:**

Instead of suppressing the Supabase invite, change the flow:
- In `handleCreateTenant`: do NOT call `create-tenant-user` yet. Just create the tenant row. Store the new tenant ID and email in state.
- In `handleSubmit`: if the selected tenant was just created (has pending email), call `create-tenant-user` with `mode: "invite"` first, then call `send-new-mail-email` with `is_new_tenant: true` which sends the combined email instead of the standard new-shipment email.

But this still sends the Supabase invite email separately...

**Better approach:** Use `createUser` instead of `inviteUserByEmail` for this case, then generate a recovery link manually.

In `create-tenant-user`, when `mode: "invite"`, it calls `adminClient.auth.admin.inviteUserByEmail` which triggers the auth-email-hook and sends the branded invite email. We need to avoid that.

**Final approach:**

1. Add a new mode `"invite_silent"` to `create-tenant-user` that creates the user via `adminClient.auth.admin.createUser` with a random password and `email_confirm: true` (no email sent), then returns the user ID.
2. In `send-new-mail-email`, when `is_new_tenant: true`, generate a recovery link via `adminClient.auth.admin.generateLink({ type: 'recovery' })` and use the combined template.
3. In `RegisterMailDialog.handleCreateTenant`: store new tenant info in state but don't invite yet.
4. In `RegisterMailDialog.handleSubmit`: if tenant was just created with email, call `create-tenant-user` with `mode: "invite_silent"`, then call `send-new-mail-email` with `is_new_tenant: true`.

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/email-templates/welcome-shipment.tsx` | New combined email template |
| `supabase/functions/send-new-mail-email/index.ts` | Handle `is_new_tenant` flag: generate recovery link, use combined template |
| `supabase/functions/create-tenant-user/index.ts` | Add `mode: "invite_silent"` — creates user silently without sending email |
| `src/components/RegisterMailDialog.tsx` | Defer invitation to submit; pass `is_new_tenant` flag; track newly created tenants |
| Migration | Insert `welcome_shipment` template into `email_templates` |

### Email template design

The combined email follows the same Flexum branding (logo, Flexum-blå `#00aaeb` button, VML/Outlook fallback, Danish copy) as existing templates. Structure:

```text
[Flexum logo]

Du har ny forsendelse i din nye postkasse

Hej {name},

Din virksomhed {company_name} har fået en postkasse hos Flexum Coworking.
Der er allerede registreret en ny {mail_type} til dig (nr. {stamp_number}).

Klik nedenfor for at sætte din adgangskode og se din post.

[ Sæt din adgangskode → ]

Denne e-mail er sendt fra Flexum.
```

### Flow summary

```text
BEFORE (2 emails):
  Create tenant → inviteUserByEmail → invite email ✉️
  Register mail → send-new-mail-email → new shipment email ✉️

AFTER (1 email):
  Create tenant → (no email yet, user created silently)
  Register mail → send-new-mail-email(is_new_tenant) → combined email ✉️
```

### Edge case: tenant created but mail NOT registered

If the operator creates a tenant with email but cancels before submitting mail, the user won't receive any email. To handle this: in `handleCreateTenant`, if the dialog is closed without submitting, fall back to calling `create-tenant-user` with normal `mode: "invite"` so they still get the standard invitation. This will be implemented via a cleanup effect or the dialog's `onOpenChange` handler.

