

## Vis antal lejere per type (Lite/Standard/Plus) på lejeroversigten

### Oversigt
Tilføj en linje med tællere for Lite, Standard og Plus lejere mellem søgefeltet og tabellen.

### Ændring

**`src/pages/TenantsPage.tsx`**

1. Tilføj et `useMemo` der tæller aktive lejere per type:
   ```typescript
   const typeCounts = useMemo(() => {
     const counts = { Lite: 0, Standard: 0, Plus: 0 };
     tenants.forEach(t => {
       const name = t.tenant_types?.name;
       if (name && name in counts) counts[name]++;
     });
     return counts;
   }, [tenants]);
   ```

2. Indsæt en `flex gap-4` container efter søge/filter-linjen (efter linje ~232) med tre farvekodede badges:
   - `Lite: X` (blå badge)
   - `Standard: X` (grøn badge)  
   - `Plus: X` (turkis badge)
   
   Bruger de eksisterende `TYPE_COLORS` til styling.

