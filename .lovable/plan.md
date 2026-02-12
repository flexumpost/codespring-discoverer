

## Udvid lejer-soegningen til ogsaa at soege paa kontaktnavn

### Hvad der aendres
Soegningen i lejer-feltet i RegisterMailDialog udvides, saa den matcher baade firmanavn (`company_name`) og kontaktperson (`contact_name`). Begge felter vises i dropdown-listen saa operatoeren nemt kan se hvem der hoerer til firmaet.

### Tekniske detaljer

**Fil: `src/components/RegisterMailDialog.tsx`**

1. **Udvid query (linje 57):** Tilfoej `contact_name` til select-felterne:
   ```
   .select("id, company_name, contact_name, tenant_type_id")
   ```

2. **Udvid filter-logik (linje 76-78):** Soeg i baade `company_name` og `contact_name`:
   ```
   const filteredTenants = tenants?.filter((t) => {
     const search = tenantSearch.toLowerCase();
     return t.company_name.toLowerCase().includes(search) ||
       (t.contact_name?.toLowerCase().includes(search) ?? false);
   }) ?? [];
   ```

3. **Vis kontaktnavn i dropdown (linje 363-377):** Vis kontaktpersonens navn under firmanavnet saa operatoeren kan se begge:
   ```
   <span>{t.company_name}</span>
   {t.contact_name && (
     <span className="text-muted-foreground ml-1">({t.contact_name})</span>
   )}
   ```

