

## Problem

Når en Standard-lejer har `send` som standardhandling for breve, viser både operatør-dashboardet og forsendelsessiden gebyret som **"0 kr."** i stedet for **"0 kr. + porto"**. Fejlen skyldes at fallback-logikken for breve (når `chosen_action` er null) ikke differentierer baseret på standardhandlingen — den returnerer altid `"0 kr."`.

## Ændringer

**Begge filer har samme fejl og skal opdateres ens:**

### 1. `src/pages/OperatorDashboard.tsx` (linje 279)

Erstat den generelle `return "0 kr."` med logik der tjekker om standardhandlingen er `send`:

```typescript
// Nuværende (linje 279):
return "0 kr.";

// Nyt:
if (defAction === "send" || defAction === "forsendelse") {
  if (tier === "Lite") return "50 kr. + porto";
  if (tier === "Standard") return "0 kr. + porto";
  return "0 kr.";
}
return "0 kr.";
```

### 2. `src/pages/ShippingPrepPage.tsx` (linje 132)

Samme ændring:

```typescript
// Nuværende (linje 132):
return "0 kr.";

// Nyt:
if (defaultAction === "send" || defaultAction === "forsendelse") {
  if (tier === "Lite") return "50 kr. + porto";
  if (tier === "Standard") return "0 kr. + porto";
  return "0 kr.";
}
return "0 kr.";
```

Dette sikrer at breve med `send` som standardhandling korrekt viser porto-tillægget, konsistent med den eksisterende logik for eksplicitte `chosen_action`-valg.

