

## Multi-tenant UI: Virksomhedsvaelger og separate indstillinger

### Oversigt
Brugere med flere virksomheder kan i dag kun se den foerste. Vi tilfojer en virksomhedsvaelger, saa de kan skifte mellem deres virksomheder i dashboardet og paa indstillingssiden.

### Problem i dag
- `TenantDashboard` henter kun en enkelt tenant via `.maybeSingle()`
- `SettingsPage` goer det samme
- Post-tabellen viser al post for alle brugerens virksomheder uden at vise hvilken virksomhed posten tilhoerer
- Statistik er samlet paa tvaers af virksomheder

### Aendringer

**1. Ny hook: `src/hooks/useTenants.tsx`**
- Henter alle virksomheder for den aktuelle bruger (ikke `.maybeSingle()` men alle raeekker)
- Holder styr paa den valgte virksomhed (`selectedTenantId`) i state
- Eksporterer `tenants`, `selectedTenant`, `setSelectedTenantId`
- Henter ogsaa `tenant_types(name, allowed_actions)` med i select

**2. Ny komponent: `src/components/TenantSelector.tsx`**
- Dropdown (Select) der viser alle brugerens virksomheder med firmanavn
- Vises kun naar brugeren har mere end 1 virksomhed
- Naar der kun er 1 virksomhed, vises intet (eller virksomhedsnavnet som tekst)

**3. Opdatering: `src/pages/TenantDashboard.tsx`**
- Brug `useTenants` hook i stedet for den nuvaerende tenant-query
- Vis `TenantSelector` oeverst paa siden (naar relevant)
- Filtrér stats-queries paa `tenant_id` for den valgte virksomhed
- Filtrér mail_items-query paa `tenant_id`
- Hent `allowed_actions` fra den valgte tenants type
- Vis virksomhedsnavn i tabellen (kun naar brugeren har flere)

**4. Opdatering: `src/pages/SettingsPage.tsx`**
- Brug `useTenants` hook
- Vis `TenantSelector` oeverst
- Vis info og redigeringsformular for den valgte virksomhed
- Naar brugeren skifter virksomhed, opdateres formularen

### Tekniske detaljer

**`useTenants` hook:**
```text
- Query: supabase.from("tenants").select("*, tenant_types(name, allowed_actions)").eq("user_id", user.id)
- State: selectedTenantId (default: foerste tenant)
- Return: { tenants, selectedTenant, selectedTenantId, setSelectedTenantId, isLoading }
```

**Dashboard mail-query filter:**
```text
query = query.eq("tenant_id", selectedTenantId)
```

**Filer der oprettes/aendres:**
- `src/hooks/useTenants.tsx` (ny)
- `src/components/TenantSelector.tsx` (ny)
- `src/pages/TenantDashboard.tsx` (opdateret)
- `src/pages/SettingsPage.tsx` (opdateret)

Ingen database-aendringer er noedvendige -- datamodellen understoetter allerede flere virksomheder per bruger.

