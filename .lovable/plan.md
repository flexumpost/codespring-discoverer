

## Flyt "Forsendelsesadresse" til eget menupunkt

### Ændringer

**1. Ny side: `src/pages/ShippingAddressPage.tsx`**
- Opret en ny side der indeholder forsendelsesadresse-kortet (klippet fra SettingsPage)
- Wrappet i `AppLayout` med overskrift "Forsendelsesadresse"
- Genbruger samme state, mutation og validering som i dag

**2. `src/components/AppSidebar.tsx`**
- Tilføj nyt menupunkt "Forsendelsesadresse" i `tenantItems` mellem "Dashboard" og "Indstillinger"
- Brug `MapPin`-ikonet fra lucide-react
- URL: `/shipping-address`

**3. `src/pages/SettingsPage.tsx`**
- Fjern forsendelsesadresse-kortet og al tilhørende state/mutation-kode (shipping-felter, shippingMutation, shippingValid, hasShippingChanges)

**4. `src/App.tsx`**
- Tilføj ny `ProtectedRoute` for `/shipping-address` → `ShippingAddressPage`

### Filoversigt

| Fil | Ændring |
|---|---|
| `src/pages/ShippingAddressPage.tsx` | Ny fil — forsendelsesadresse-formular |
| `src/components/AppSidebar.tsx` | Tilføj "Forsendelsesadresse" til tenant-menu |
| `src/pages/SettingsPage.tsx` | Fjern shipping-kort og relateret kode |
| `src/App.tsx` | Tilføj route `/shipping-address` |

