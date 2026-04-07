

## Fix: Ret OfficeRnD OAuth scope-format

### Problem
Koden sender scopes i forkert format:
- **Nuværende**: `flexum/charges.write flexum/members.read`
- **Korrekt**: `flex.billing.charges.create flex.community.members.read`

### Løsning

**Fil**: `supabase/functions/sync-officernd-charge/index.ts`

I `getOfficeRndToken`-funktionen, ændr scope-strengen:

```typescript
// Fra:
scope: `${orgSlug}/charges.write ${orgSlug}/members.read`,

// Til:
scope: "flex.billing.charges.create flex.community.members.read",
```

Scopet er fast og afhænger ikke af `orgSlug`. De aktiverede scopes i OfficeRnD dækker alt hvad der er brug for.

### Efter deploy
Test igen med brev 2976 for at bekræfte at gebyret overføres korrekt.

