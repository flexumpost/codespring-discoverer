

## Fix: "Standard forsendelse" vises ikke i dropdown

### Problem
Linje 720 i `TenantDashboard.tsx` filtrerer ekstra handlinger mod `allowedActions` fra databasen. `standard_forsendelse` findes ikke i `allowed_actions` på tenant_types-tabellen, så den bliver filtreret væk. Samme mønster som `anden_afhentningsdag`, der har en special-undtagelse fordi den er en UI-variant af `afhentning`.

### Løsning
Tilføj en undtagelse for `standard_forsendelse` i filteret på linje 720, så den vises når `send` er i `allowedActions` (da "Standard forsendelse" er en variant af forsendelse).

### Ændring

**`src/pages/TenantDashboard.tsx`** — linje 720:

Nuværende:
```typescript
(a) => allowedActions.includes(a) || (a === "anden_afhentningsdag" && allowedActions.includes("afhentning"))
```

Ny:
```typescript
(a) => allowedActions.includes(a) 
  || (a === "anden_afhentningsdag" && allowedActions.includes("afhentning"))
  || (a === "standard_forsendelse" && allowedActions.includes("send"))
```

Én linje tilføjet. Ingen andre ændringer.

