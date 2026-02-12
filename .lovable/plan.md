
# Opret ny lejer direkte fra registreringsformularen

## Hvad det goer for brugeren
Naar operatoeren soeger efter en lejer og der ikke findes nogen match, vises en knap "Opret [navn] som ny lejer". Ved klik aabnes en dialog hvor operatoeren kan udfylde de noedvendige oplysninger og oprette lejeren med det samme - uden at forlade registreringsformularen.

## Teknisk implementering

### Fil: `src/components/RegisterMailDialog.tsx`

1. **Vis "Opret ny lejer"-mulighed i soegeresultater**
   - Naar `tenantSearch` har tekst men `filteredTenants` er tom (ingen match), vis en knap i dropdown-listen: "Opret '[soege-tekst]' som ny lejer"
   - Klik paa knappen aabner en ny dialog til oprettelse

2. **Ny state-variabler**
   - `showCreateTenant: boolean` - styrer om opret-dialogen vises
   - `newTenantName: string` - pre-udfyldt med soege-teksten
   - `creatingTenant: boolean` - loading-state under oprettelse

3. **Ny komponent/sektion: Opret Lejer-dialog**
   - En nested `Dialog` med felter for:
     - Firmanavn (pre-udfyldt fra soege-teksten)
     - Kontaktperson (valgfrit)
     - Kontakt-email (valgfrit)
     - Adresse (valgfrit)
     - Lejertype (vaelges fra `tenant_types`-tabellen)
   - Hent `tenant_types` med en ekstra useQuery
   - Ved submit: indsaet ny lejer i `tenants`-tabellen, vælg automatisk den nye lejer i formularen, og luk dialogen

4. **Flow efter oprettelse**
   - Den nye lejer vaelges automatisk (`setSelectedTenantId` / `setSelectedTenantName`)
   - `tenants-active` query invalideres saa listen opdateres
   - Operatoeren kan fortsaette med at udfylde resten af postregistreringen

### Forudsaetninger
- RLS-politikker tillader allerede operatoerer at indsaette i `tenants`-tabellen
- `tenant_types` kan allerede laeses af autentificerede brugere
- Ingen database-aendringer er noedvendige
