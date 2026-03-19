
**Diagnose (bekræftet)**
- Fejlen er **ikke længere UI-scroll**. Dialogen og knappen virker, men gem fejler server-side.
- Jeg fandt backend-fejl i logs: **`infinite recursion detected in policy for relation "tenants"`**.
- Årsagen er den nuværende RLS-policy på `tenants`:
  - `WITH CHECK` indeholder en subquery mod samme tabel (`SELECT ... FROM tenants t WHERE t.id = tenants.id`).
  - Det skaber rekursion under `UPDATE`, så gem af forsendelsesadresse fejler.

**Implementeringsplan**
1. **Ret RLS-rekursion i database (hovedfix)**
   - Opret en `SECURITY DEFINER` funktion (fx `public.tenant_type_matches(_tenant_id uuid, _tenant_type_id uuid)`), der slår `tenant_type_id` op internt.
   - Drop og genskab policyen **"Tenants update own tenant"** så den bruger funktionen i stedet for direkte subquery i policyen.
   - Behold samme adgangsniveau som nu (`user_id = auth.uid()`), så vi ændrer mindst muligt funktionelt.

2. **Behold beskyttelsen mod tier-eskalering**
   - Den nye policy skal stadig sikre, at lejer ikke kan ændre `tenant_type_id`.
   - Kun implementeringsmetoden ændres (fra rekursiv subquery til definer-funktion).

3. **Gør fejl synlige i UI (hurtigere fejlsøgning fremover)**
   - I `ShippingAddressGuard` (og samme gemmemønster på `/shipping-address`) vis den konkrete backend-fejl i toast/log (ikke kun generisk “Kunne ikke gemme...”).
   - Behold den eksisterende “verify persisted” kontrol efter update.

**Konkrete filer der ændres**
- `supabase/migrations/<ny_migration>.sql`
  - Opret funktion + opdater policy på `public.tenants`.
- `src/components/ShippingAddressGuard.tsx`
  - Forbedret fejlhåndtering/visning.
- `src/pages/ShippingAddressPage.tsx`
  - Samme forbedrede fejlhåndtering for konsistens.

**Tekniske detaljer (kort)**
- Nuværende policy-del, der skaber problemet:
  - `tenant_type_id = (SELECT t.tenant_type_id FROM tenants t WHERE t.id = tenants.id)`
- Ny retning:
  - `WITH CHECK (user_id = auth.uid() AND public.tenant_type_matches(id, tenant_type_id))`
- `SECURITY DEFINER` bryder RLS-rekursionskæden sikkert.

**Validering efter implementering**
1. Opret ny lejer via det nye samlede mailflow.
2. Sæt adgangskode via mail-link.
3. Log ind som lejer og gem forsendelsesadresse:
   - Forventet: succes-toast + guard forsvinder.
4. Bekræft i database at `shipping_confirmed = true` og adressefelter er gemt.
5. Negativ test: forsøg at ændre `tenant_type_id` som lejer (skal afvises).

**Forventet effekt**
- Gem af forsendelsesadresse virker igen for nye lejere.
- Samme sikkerhedsniveau bevares.
- Fremtidige policy-fejl bliver hurtigere at identificere via tydeligere fejlmeddelelser.
