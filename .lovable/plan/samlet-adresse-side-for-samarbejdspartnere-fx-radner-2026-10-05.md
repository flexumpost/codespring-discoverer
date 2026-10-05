# Samlet adresse-side for samarbejdspartnere (fx Radner)

## Nuværende situation
Radners login (post@radner.dk) ejer allerede både Radner ApS (Wroclaw) og EUROSTEEL INSTALLATION ApS (Kielce). Hvert firma har sin egen forsendelsesadresse. I dag skal Radner skifte firma øverst på siden for at se eller rette hver adresse.

## Hvad der bygges
1. **Ny markering på lejeren: "Samarbejdspartner"** – en kontakt, som operatøren slår til på lejerens side. Den slås til for Radner ApS.
2. **Ny side for lejeren: "Forsendelsesadresser"** – vises kun i menuen, når et af brugerens firmaer er markeret som samarbejdspartner.
   - Viser alle firmaer, brugeren har adgang til, i en liste. Hvert firma har sin adresse: modtager, c/o, adresse 1 og 2, postnummer, by, region og land.
   - Hver adresse kan rettes og gemmes direkte på siden, uden at skifte firma.
   - Har et firma ingen adresse eller en adresse, der ikke er bekræftet, bliver det tydeligt markeret.
3. Forsendelser bruger som før adressen på det firma, de tilhører. Afsendelse og konvolutter er uændrede.

## Teknisk
- Migration: `tenants.is_partner boolean not null default false`. Lejere må ikke selv ændre feltet, så det tilføjes til den eksisterende trigger, der forhindrer lejere i at ændre egne felter.
- Data: `UPDATE tenants SET is_partner = true WHERE id = 'a45c4722-…'` (Radner ApS).
- Operatør: kontakt i `TenantDetailPage.tsx`.
- Lejer: ny `PartnerAddressesPage.tsx` med route og menupunkt i `AppSidebar.tsx`, som kun vises, når `tenants.some(t => t.is_partner)`. Siden bruger `useTenants()` og samme opdatering som `ShippingAddressGuard`, og sætter `shipping_confirmed = true`.
- Tekster på dansk og engelsk i i18n-filerne.
