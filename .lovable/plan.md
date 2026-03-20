

## Tilføj søgning og filtrering på lejeroversigten

### Oversigt
Tilføj en søgelinje og en "Ubetalt faktura"-checkbox over tabellen, så operatører kan søge på lejernavn og filtrere til kun at vise lejere med ubetalt faktura.

### Ændringer

**`src/pages/TenantsPage.tsx`**

1. Tilføj to nye state-variabler: `searchQuery` (string) og `filterUnpaid` (boolean).

2. Indsæt en filterlinje mellem overskriften og tabellen:
   - Et `<Input>` felt med placeholder "Søg på lejer navn..." 
   - En `<Checkbox>` med label "Ubetalt faktura"
   - Placeret i en `flex items-center gap-4 mb-4` container.

3. Filtrér `tenants`-listen med `useMemo` før rendering:
   ```typescript
   const filteredTenants = useMemo(() => {
     return tenants.filter(t => {
       const matchesSearch = !searchQuery || 
         t.company_name.toLowerCase().includes(searchQuery.toLowerCase());
       const matchesUnpaid = !filterUnpaid || t.has_unpaid_invoice;
       return matchesSearch && matchesUnpaid;
     });
   }, [tenants, searchQuery, filterUnpaid]);
   ```

4. Brug `filteredTenants` i stedet for `tenants` i `TableBody`-mappingen og i "Vælg alle"-logikken.

