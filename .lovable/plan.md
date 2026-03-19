

## Omdøb "Send hurtigst muligt" til "Ekstra forsendelse" for Lite breve + flyt i dropdown

### Problem
For Lite breve vises `send`-handlingen som "Send hurtigst muligt" i dropdown-menuen. Ifølge billedreferencen skal den hedde "Ekstra forsendelse" (50 kr. + porto) og placeres lige under "Standard forsendelse".

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. Label-ændring (linje 104)**
Ændr `send`-label for Lite fra "Send hurtigst muligt" til "Ekstra forsendelse":
```typescript
if (action === "send") return "Ekstra forsendelse";
```

**2. Dropdown-rækkefølge (linje 86-91)**
I alle Lite brev switch-cases, flyt `send` til lige efter `standard_forsendelse`:
```
Før:  [..., "send", "standard_forsendelse", ...]
Efter: [..., "standard_forsendelse", "send", ...]
```

### Hvad ændres IKKE
- Pris-logik: `send` returnerer stadig "50 kr. + porto" for Lite
- Status-logik: Uændret
- Andre tiers: Uændret

