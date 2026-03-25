

## Tilføj lejertype-badge i "Lejer"-kolonnen på operatør-dashboardet

### Hvad ændres

I operatør-dashboardet vises lejerens firmanavn allerede i "Lejer"-kolonnen. Vi tilføjer en lille farvekodet badge med lejertypen (Lite, Standard, Plus, Fastlejer, Nabo, Retur) lige efter firmanavnet, så operatøren hurtigt kan se typen uden at klikke.

### Tekniske detaljer

**File: `src/pages/OperatorDashboard.tsx`** (linje 656-662)

Efter `{item.tenants.company_name}` og før "Ubetalt"-badgen, indsættes en ny Badge med lejertypen:

```tsx
{item.tenants.company_name}
{item.tenants?.tenant_types?.name && (
  <Badge className={cn("ml-1.5 text-[10px] px-1.5 py-0", getTenantTypeBadgeClass(item.tenants.tenant_types.name))}>
    {item.tenants.tenant_types.name}
  </Badge>
)}
{item.tenants?.has_unpaid_invoice && ( ... )}
```

Tilføj en hjælpefunktion `getTenantTypeBadgeClass` der returnerer de korrekte farver baseret på domænereglerne:
- **Lite**: blå baggrund
- **Standard**: grøn baggrund
- **Plus**: #00aaeb baggrund med mørk blå tekst
- **Fastlejer**: ravgul baggrund
- **Nabo**: cyan baggrund
- **Retur til afsender**: rød baggrund

Ingen database- eller oversættelsesændringer nødvendige — `tenant_types.name` hentes allerede i den eksisterende query.

