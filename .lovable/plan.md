

## Plan: Flyt TenantSelector over overskriften på Indstillinger og Forsendelsesadresse

På TenantDashboard står TenantSelector **over** overskriften "Min post". På SettingsPage og ShippingAddressPage står den **under** overskriften. Løsningen er at bytte rækkefølgen.

### Ændringer

**1. `src/pages/SettingsPage.tsx` (linje 80-86)**
Flyt TenantSelector op før `<h2>`:
```tsx
<div className="mb-6">
  <TenantSelector ... />
  <h2 className="text-2xl font-bold mt-4">Indstillinger</h2>
</div>
```

**2. `src/pages/ShippingAddressPage.tsx` (linje 115-121)**
Samme ændring:
```tsx
<div className="mb-6">
  <TenantSelector ... />
  <h2 className="text-2xl font-bold mt-4">Forsendelsesadresse</h2>
</div>
```

