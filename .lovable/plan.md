

## Fix: "Gratis afhentning" vises ikke korrekt på operatør-dashboardet

### Problem

Operatør-dashboardet kender ikke til handlingen `gratis_afhentning`. Når en lejer vælger "Gratis afhentning", falder operatør-siden igennem alle action-checks i `getOperatorStatusDisplay` og ender på fallback `STATUS_LABELS[item.status]` → "Afventer handling".

### Ændringer i `src/pages/OperatorDashboard.tsx`

**1. ACTION_LABELS (linje 26-34)** — tilføj `gratis_afhentning`:
```typescript
gratis_afhentning: "Gratis afhentning",
```

**2. getOperatorStatusDisplay (efter linje 150)** — tilføj case for `gratis_afhentning`:
```typescript
if (action === "gratis_afhentning") {
  const nextDate = getFirstThursdayOfMonth();
  return `Gratis afhentning ${formatDanishDate(nextDate)}`;
}
```

**3. "Afhentes"-kort filter (linje 265)** — inkludér `gratis_afhentning`:
```typescript
filter: (item) => item.chosen_action === "afhentning" || item.chosen_action === "gratis_afhentning",
```

**4. Row color (mailRowColor.ts)** — tilføj `gratis_afhentning` til afhentnings-farven (lilla), linje 56:
```typescript
["afhentning", "anden_afhentningsdag", "gratis_afhentning"].includes(item.chosen_action)
```

Ingen database- eller gebyr-ændringer nødvendige — gebyret for `gratis_afhentning` håndteres allerede korrekt (linje 317: "0 kr.").

