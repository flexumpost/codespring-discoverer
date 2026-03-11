

## Fix: Forsendelser med "under_forsendelse" skal forblive synlige under "Send"-kortet

### Problem
Når `chosen_action` opdateres til `under_forsendelse`, forsvinder forsendelsen fra "Send"-kortet, fordi filteret kun matcher `chosen_action === "send"`.

### Løsning i `src/pages/OperatorDashboard.tsx`

Opdater "Send"-kortet i `CARD_FILTERS` (linje 68-73):

- **filter** (bestemmer hvilke items der vises i tabellen): Inkluder både `"send"` og `"under_forsendelse"`
- **countFilter** (bestemmer tallet på kortet): Tæl kun `"send"` — ikke `"under_forsendelse"`

```typescript
{
  title: "Send",
  icon: Send,
  color: "text-primary",
  filter: (item) => item.chosen_action === "send" || item.chosen_action === "under_forsendelse",
  countFilter: (item) => item.chosen_action === "send",
},
```

Dette er den eneste ændring. Forsendelser markeret som "under forsendelse" vil fortsat vises i tabellen under "Send"-kortet, men tælles ikke med i korttallet.

