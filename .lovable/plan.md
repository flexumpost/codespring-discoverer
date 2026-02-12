

# Opdater dashboard-kort for lejere

## Hvad der aendres
De 3 eksisterende kort paa TenantDashboard erstattes med 4 nye kort der viser mere praecise statusoversigter.

## Nye kort

| Kort | Beskrivelse | Query-filter |
|------|-------------|--------------|
| Ny post | Post lejeren ikke har taget stilling til | `status = 'ny'` |
| Ulaeste breve | Scannede breve lejeren ikke har aabnet | `status = 'ulaest'` |
| Laeste breve | Scannede breve lejeren har aabnet | `status = 'laest'` |
| Arkiveret | Breve og pakker lejeren har arkiveret | `status = 'arkiveret'` |

## Tekniske detaljer

### Fil: `src/pages/TenantDashboard.tsx`
- Udvid `stats` state til 4 vaerdier: `ny`, `ulaest`, `laest`, `arkiveret`
- Opdater `fetchStats` til 4 parallelle queries med de korrekte statusfiltre
- Opdater `cards` arrayet til 4 kort med passende ikoner:
  - Ny post: `Mail` ikon
  - Ulaeste breve: `Clock` ikon
  - Laeste breve: `Eye` ikon (importeres fra lucide-react)
  - Arkiveret: `Archive` ikon
- Aendr grid fra `md:grid-cols-3` til `md:grid-cols-4` for at vise alle 4 kort

