

## Opdel navnefelter til fornavn og efternavn

### Oversigt
Opdel `contact_name` (tenants-tabellen) til `contact_first_name` + `contact_last_name`, og `full_name` (profiles-tabellen) til `first_name` + `last_name`. Migrer eksisterende data ved at splitte på første mellemrum.

### 1. Database-migration

```sql
-- Tenants: tilføj nye kolonner, migrer data, fjern gammel kolonne
ALTER TABLE public.tenants ADD COLUMN contact_first_name text;
ALTER TABLE public.tenants ADD COLUMN contact_last_name text;

UPDATE public.tenants SET
  contact_first_name = split_part(contact_name, ' ', 1),
  contact_last_name = CASE
    WHEN position(' ' in coalesce(contact_name,'')) > 0
    THEN substring(contact_name from position(' ' in contact_name) + 1)
    ELSE NULL
  END
WHERE contact_name IS NOT NULL;

ALTER TABLE public.tenants DROP COLUMN contact_name;

-- Profiles: tilføj nye kolonner, migrer data, fjern gammel kolonne
ALTER TABLE public.profiles ADD COLUMN first_name text;
ALTER TABLE public.profiles ADD COLUMN last_name text;

UPDATE public.profiles SET
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE
    WHEN position(' ' in coalesce(full_name,'')) > 0
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL;

ALTER TABLE public.profiles DROP COLUMN full_name;
```

### 2. Edge function: `create-tenant-user/index.ts`
- Accepter `first_name` + `last_name` i stedet for `full_name`
- Send `{ first_name, last_name }` som user_metadata ved invite/oprettelse

### 3. Edge function: `create-operator/index.ts`
- Samme ændring: accepter `first_name` + `last_name`

### 4. Database trigger: `handle_new_user()`
- Opdater til at indsætte `first_name` og `last_name` fra `raw_user_meta_data` i stedet for `full_name`

### 5. UI-ændringer

**`TenantDetailPage.tsx`** (operatør-redigering):
- Erstat ét kontaktperson-felt med to felter: "Fornavn" og "Efternavn"
- Opdater `contactMutation` til at sende `contact_first_name` + `contact_last_name`
- Opdater fuzzy match-display

**`TenantsPage.tsx`** (opret lejer-dialog):
- Erstat "Kontaktperson" med "Fornavn" + "Efternavn"
- Opdater insert og invite-kald

**`SettingsPage.tsx`** (lejer-visning):
- Vis "Fornavn" og "Efternavn" som read-only felter
- Opdater postmodtager-oprettelsesdialogen: to felter i stedet for ét "Navn"-felt
- Opdater visning af postmodtagere: `first_name + " " + last_name`

**`RegisterMailDialog.tsx`** og **`AssignTenantDialog.tsx`**:
- Opdater `contact_name` referencer til `contact_first_name`/`contact_last_name` i fuzzy match og visning

**`AppLayout.tsx`**:
- Vis `first_name` fra user_metadata i stedet for `full_name`

**`OperatorsList.tsx`**:
- Opdater profil-visning til `first_name + " " + last_name`

**`MailItemLogSheet.tsx`**:
- Opdater profil-hentning og visning

### 6. Alle steder der læser `profiles.full_name` eller `tenants.contact_name`
Opdateres til at bruge de nye kolonner og sammensætte `${first_name} ${last_name}` hvor fuldt navn vises.

