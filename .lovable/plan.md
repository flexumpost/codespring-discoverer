

## Tilføj ulæst-note indikator på lejer-dashboardet

### Problem
Lejer-dashboardet viser ingen visuel indikation af at en forsendelse har en ulæst note fra operatøren. Indikatoren findes allerede på operatør-dashboardet (MessageSquare-ikon ved forsendelsesnr.), men mangler på lejer-siden.

### Ændring

**`src/pages/TenantDashboard.tsx`**:

- Importér `MessageSquare` fra `lucide-react`
- Opdater forsendelsesnr.-cellen (linje ~718) til at vise et `MessageSquare`-ikon når `item.notes` har indhold og `item.note_read === false` — samme mønster som operatør-dashboardet

```text
Før:  2830
Efter: 2830 💬  (ikon der indikerer ulæst note)
```

### Filer
- **Ændret**: `src/pages/TenantDashboard.tsx` — tilføj MessageSquare import + ikon ved stamp_number

