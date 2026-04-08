

## Fjern "Afhentning" som standardhandling + auto-sæt pakker til "Forsendelse"

### Oversigt
Fjern muligheden for at vælge "Afhentning" som standardhandling for både breve og pakker. Pakkers standardhandling sættes automatisk til "Forsendelse". For breve kan der vælges mellem "Forsendelse" og "Scanning".

### Berørte filer og ændringer

| Fil | Ændring |
|-----|---------|
| `src/components/DefaultActionSetup.tsx` | Fjern "afhentning" fra MAIL_ACTIONS og PACKAGE_ACTIONS. Sæt `packageAction` til `"send"` som default og fjern pakke-dropdown (auto-gem `"send"`). |
| `src/components/PricingOverview.tsx` | **MailPricingCard** (linje 73-77): Fjern `afhentning` fra MAIL_ACTIONS-listen. **PackagePricingCard** (linje 134-137): Fjern `afhentning` fra PACKAGE_ACTIONS, og fjern dropdown — vis i stedet en read-only tekst "Forsendelse" da det er den eneste mulighed. Auto-sæt `default_package_action` til `"send"` hvis den aktuelt er `"afhentning"`. |

### Detaljer

**DefaultActionSetup.tsx:**
- `MAIL_ACTIONS`: Kun `send` og `scan`
- `PACKAGE_ACTIONS`: Fjernes helt — `packageAction` hardcodes til `"send"`
- Pakke-dropdown skjules, kun brev-valg vises
- Ved gem sendes `default_package_action: "send"` automatisk

**PricingOverview.tsx — MailPricingCard:**
- `MAIL_ACTIONS` (linje 73-76): Fjern `afhentning`-entry, behold `send` og `scan`

**PricingOverview.tsx — PackagePricingCard:**
- Fjern dropdown-valg, da "Forsendelse" er den eneste mulighed
- Vis blot en tekst der indikerer at standardhandlingen er "Forsendelse"
- Mutation opdaterer automatisk til `"send"` hvis nuværende værdi er `"afhentning"`

Afhentning forbliver tilgængelig som ekstra handling i TenantDashboard — ingen ændringer der.

