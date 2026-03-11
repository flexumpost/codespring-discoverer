

## Ændring af handlingssystemet: Standard vs. Ekstra handling

### Koncept

Systemet ændres så:
- **Standard handling** (valgt i indstillinger) er den der altid gælder som status for nye forsendelser
- **"Vælg handling"** dropdown viser kun **ekstra handlinger** (ikke standardhandlingen)
- Ekstra handlinger varierer per tier og type (brev/pakke)

### Ekstra handlinger per tier

**Breve:**
| Tier | Ekstra handlinger | Pris |
|---|---|---|
| Lite | Scanning, Afhentning, Forsendelse | 50 kr |
| Standard | Scanning, Afhentning | 30 kr |
| Plus | Ingen (dropdown skjules) | — |

**Pakker:** Alle tiers har forsendelse + afhentning (standard handling bestemmer default). Pakker har altid et håndteringsgebyr (Lite: 50, Standard: 30, Plus: 10).

### Ændringer

| Fil | Ændring |
|---|---|
| `src/pages/TenantDashboard.tsx` | Ændr "Vælg handling"-dropdown til kun at vise ekstra handlinger baseret på tier. For Plus breve: skjul dropdown helt. Vis standardhandlingens status automatisk for items uden explicit `chosen_action`. Tilføj hjælpefunktion `getExtraActions(tenantTypeName, mailType)`. |
| `src/components/DefaultActionSetup.tsx` | Behold som den er — standardhandlinger er allerede korrekte (scan/send/afhentning for breve, send/afhentning for pakker). |
| `src/components/PricingOverview.tsx` | Opdater forklaringstekst-visning til at matche det nye format med Standard handling og Ekstra handling sektioner. |

### Logik i TenantDashboard

```typescript
function getExtraActions(tenantTypeName: string | undefined, mailType: string): string[] {
  if (mailType === "pakke") {
    // For pakker: begge handlinger er tilgængelige som ekstra
    return ["send", "afhentning"];
  }
  // Breve:
  switch (tenantTypeName) {
    case "Lite": return ["scan", "afhentning", "send"];
    case "Standard": return ["scan", "afhentning"];
    case "Plus": return []; // Ingen ekstra handling
    default: return [];
  }
}
```

- Dropdown vises kun når `getExtraActions().length > 0`
- Dropdown filtrerer standardhandlingen ud (viser kun de andre muligheder)
- Items uden `chosen_action` viser status baseret på `default_mail_action` / `default_package_action`

