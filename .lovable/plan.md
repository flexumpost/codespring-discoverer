

## Tilføj lejertype-badge ved firmanavne i kort-header på ShippingPrepPage

### Problem
Kort-headeren viser kun firmanavne kommasepareret uden lejertype. Operatøren mangler overblik over hvilken tier hver virksomhed tilhører.

### Ændringer i `src/pages/ShippingPrepPage.tsx`

**1. Import Badge**
Tilføj `import { Badge } from "@/components/ui/badge"` og gendan `TYPE_COLORS` fra TenantSelector.

**2. Udvid grupperingsdata (linje 199-218)**
Ændr `companyNames: string[]` til `companies: { name: string; typeName: string }[]` og gem både navn og lejertype ved gruppering.

**3. Opdater kort-header (linje 302-304)**
Erstat den kommaseparerede linje med en liste hvor hvert firmanavn vises på sin egen linje:

```
brugerfirma [Lite badge] [Copy ikon]
Firma 2 [Standard badge] [Copy ikon]
Firma 3 [Plus badge] [Copy ikon]
```

Hvert firma vises som:
```tsx
{group.companies.map((c, i) => (
  <span key={i} className="flex items-center gap-1.5">
    {c.name}
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 leading-4", TYPE_COLORS[c.typeName])}>
      {c.typeName}
    </Badge>
    <Copy className="h-3.5 w-3.5 ..." onClick={() => copyToClipboard(c.name)} />
  </span>
))}
```

Copy-ikonet kopierer kun firmanavnet — ikke badge-teksten.

### Fil
- `src/pages/ShippingPrepPage.tsx`

