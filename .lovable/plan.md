

## Plan: Tilføj "Beta"-badge og "Giv tilbagemelding"-knap til lejer-dashboardet

### Ændringer i `src/pages/TenantDashboard.tsx`

Ved "Min post"-overskriften (linje 712), tilføj:

1. **Beta-badge**: En `<Badge>` med teksten "Beta" i en iøjnefaldende farve (orange/amber) ved siden af overskriften
2. **"Giv tilbagemelding"-knap**: En `mailto:`-knap der sender e-mail til `kontakt@flexum.dk` med emnet "Tilbagemelding fra [firmanavn]", hvor firmanavn hentes fra `selectedTenant?.company_name`

Layout: Overskriften, badge og knap placeres i en flex-container med items centreret og space-between, så knappen flyttes til højre.

```text
┌──────────────────────────────────────────────────┐
│ Min post  [Beta]                [Giv tilbagemelding] │
└──────────────────────────────────────────────────┘
```

### Ændrede filer
- `src/pages/TenantDashboard.tsx` — Kun denne fil ændres

