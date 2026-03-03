

## Opdel indstillingssiden i 3 kolonner

### Ændring

**`src/pages/SettingsPage.tsx`**
- Skift grid-layoutet fra `grid gap-6 max-w-lg` (enkelt kolonne) til `grid grid-cols-1 lg:grid-cols-3 gap-6` (3 kolonner på desktop)
- **Kolonne 1**: Virksomhed-kort + Kontaktoplysninger-kort (wrappet i en `div` med `space-y-6`)
- **Kolonne 2**: Breve-kortet fra PricingOverview
- **Kolonne 3**: Pakker-kortet fra PricingOverview

**`src/components/PricingOverview.tsx`**
- Opdel komponenten til at returnere to separate kort via en render-prop eller eksporter to individuelle komponenter (`MailPricingCard` og `PackagePricingCard`), så de kan placeres i hver sin kolonne
- Alternativt: eksporter hele komponenten som to children der kan destructures i SettingsPage

### Tilgang

Enkleste løsning: Opdel `PricingOverview` i to eksporterede komponenter (`MailPricingCard` og `PackagePricingCard`) der deler samme konstanterne men renderes uafhængigt. SettingsPage placerer dem i kolonne 2 og 3.

### Filoversigt

| Fil | Ændring |
|---|---|
| `src/components/PricingOverview.tsx` | Eksporter `MailPricingCard` og `PackagePricingCard` som separate komponenter |
| `src/pages/SettingsPage.tsx` | 3-kolonne grid layout, placer kort i respektive kolonner |

