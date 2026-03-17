

## Gør Firmanavn redigerbart for operatører

### Ændringer i `src/pages/TenantDetailPage.tsx`

Firmanavnet vises i dag som statisk tekst (linje 275-276). Det skal ændres til et redigerbart `Input`-felt:

1. Tilføj state: `companyName` (initialiseret fra `tenant.company_name` i `useEffect`)
2. Erstat den statiske `<p>` med et `<Input>`-felt bundet til `companyName`
3. Inkluder `company_name` i den eksisterende `contactMutation` (eller `typeMutation`) — mest logisk at tilføje det til virksomhedskortet sammen med type-gem-knappen
4. Opdater `typeChanged`-logikken til også at inkludere firmanavn-ændringer, så "Gem"-knappen aktiveres
5. Opdater `typeMutation` til at sende `company_name` sammen med `tenant_type_id`

Lejere har ikke adgang til denne side (den ligger under `/tenants/:id` som kun er i operatør-navigationen), og RLS tillader kun operatører at opdatere — så ingen yderligere adgangskontrol er nødvendig.

