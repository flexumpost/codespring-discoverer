

## Integrer standardhandling i priskortene

### Ændringer

**`src/components/PricingOverview.tsx`**
- Udvid props med `tenant` og `onDefaultActionSaved` callback (eller direkte mutation-logik)
- I **Breve-kortet**: Tilføj en Select-dropdown øverst i CardContent (før forklaringsteksten) til valg af standard brevhandling + Gem-knap
- I **Pakker-kortet**: Tilføj tilsvarende Select-dropdown øverst til valg af standard pakkehandling + Gem-knap
- Flyt MAIL_ACTIONS og PACKAGE_ACTIONS konstanterne hertil, samt mutation-logik fra DefaultActionCard

**`src/components/DefaultActionCard.tsx`**
- Slet filen — funktionaliteten er nu integreret i PricingOverview

**`src/pages/SettingsPage.tsx`**
- Fjern `<DefaultActionCard>` import og brug
- Send `tenant`-objekt som prop til `<PricingOverview>` (udover `tenantTypeName`)

### Resultat
Hvert priskort får sin egen standardhandling-sektion øverst, så brugeren ser valg og priser samlet per kategori (breve / pakker). Én samlet Gem-knap per kort.

