## Problem

Scan-upload fejler med `infinite recursion detected in policy for relation "mail_items"`.

Årsagen er RLS-policyen `Tenants update own mail action` på `mail_items`. Dens `WITH CHECK` indeholder ~14 subselects af typen `(SELECT m.<col> FROM mail_items m WHERE m.id = mail_items.id)` — altså opslag i samme tabel som policyen beskytter. Det udløser uendelig rekursion ved enhver `UPDATE`, også for operatører (fordi flere permissive UPDATE-policies kombineres med OR og alle evalueres).

Policyens intention er at lade lejere kun ændre `chosen_action`/handlingsfelter og blokere ændringer af følsomme felter som `scan_url`, `status`, `tenant_id`, osv.

## Løsning

1. Tilføj en `SECURITY DEFINER` helper-funktion `public.mail_item_field_unchanged(_id uuid, _field text, _new_value text)` der slår op i `mail_items` udenom RLS — eller endnu enklere: flyt immutability-checks ud i en `BEFORE UPDATE` trigger og forenkl policyen.

   Foretrukket: en `BEFORE UPDATE` trigger `enforce_tenant_mail_item_immutability` der, hvis kalderen ikke er operator (`NOT is_operator()`), kaster fejl hvis nogen af de beskyttede felter ændres (`scan_url`, `status`, `tenant_id`, `operator_id`, `mail_type`, `sender_name`, `photo_url`, `tracking_number`, `stamp_number`, `porto_option`, `is_registered`, `received_at`, `scanned_at`).

2. Erstat policyen `Tenants update own mail action` med en simpel udgave:
   ```sql
   USING  (tenant_id IN (SELECT my_tenant_ids()))
   WITH CHECK (tenant_id IN (SELECT my_tenant_ids()))
   ```
   Triggeren håndterer kolonne-beskyttelsen, så der ikke længere er rekursive opslag i `mail_items`.

3. Behold `Operators update mail` policyen som den er — operatører kan opdatere alt (inkl. `scan_url`) uden problem.

## Validering

- Operator drag-and-drop scan-upload virker (storage upload + `scan_url`-update lykkes).
- Operator "Upload scan"-dialog virker.
- Lejer kan stadig vælge `chosen_action` på egne mail items.
- Lejer kan IKKE ændre `scan_url`/`status`/etc. (triggeren afviser).

## Tekniske noter

- Filer berørt: én ny migration der dropper + genskaber policyen og tilføjer trigger + funktion.
- Ingen frontend-ændringer nødvendige; den forbedrede fejlmeddelelse i `OperatorDashboard.tsx` (fra forrige tur) bliver hængende som diagnostisk hjælp.