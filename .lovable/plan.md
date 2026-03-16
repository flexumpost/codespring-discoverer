

## Slet lejer-konto fra detaljesiden

### Ændringer i `src/pages/TenantDetailPage.tsx`

1. **Tilføj slet-knap** i headeren (rød, destruktiv variant) ved siden af lejernavnet
2. **Tilføj bekræftelsesdialog** med AlertDialog-komponent der tydeligt advarer om at handlingen er permanent og viser firmanavnet
3. **Implementer sletning** via Supabase — operatører har allerede DELETE-rettighed på `tenants`-tabellen via RLS
4. **Oprydning**: Slet også tilknyttede auth-brugere og roller via en ny Edge Function `delete-tenant`, da vi skal bruge service_role til at slette auth-brugere

### Edge Function: `supabase/functions/delete-tenant/index.ts`

Nødvendig fordi sletning af en lejer kræver:
- Sletning af `tenant_users`-rækker
- Sletning af tilknyttede `user_roles`
- Sletning af auth-brugere (kræver service_role)
- Sletning af `mail_items` tilknyttet lejeren
- Sletning af selve `tenants`-rækken

Funktionen verificerer at kalderen er operatør.

### Bekræftelsesdialog

Brugeren skal bekræfte sletningen med lejerens firmanavn vist tydeligt i advarslen. Tekst: "Er du sikker på at du vil slette [firmanavn]? Alle data inkl. posthistorik og brugerkonti tilknyttet denne lejer vil blive permanent slettet."

### Filer

| Fil | Ændring |
|---|---|
| `src/pages/TenantDetailPage.tsx` | Tilføj slet-knap + AlertDialog |
| `supabase/functions/delete-tenant/index.ts` | Ny Edge Function til sikker sletning |

