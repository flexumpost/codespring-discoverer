

## Tilføj "Alle forsendelser"-kort til lejer-dashboardet

### Problem
Brugere kan ikke finde ud af at vende tilbage til visningen af alle forsendelser, når de har klikket på et af de eksisterende filterkort.

### Ændringer i `src/pages/TenantDashboard.tsx`

1. **Tilføj et nyt "Alle forsendelser"-kort** som det første i `cards`-arrayet (linje 679):
   - Ny entry med `status: null` (ingen filter = vis alle)
   - Ikon: `Mail` eller `Inbox` fra lucide-react
   - Værdi: summen af alle ikke-arkiverede forsendelser (kan beregnes fra eksisterende stats eller tilføjes som separat count)

2. **Gør kortet aktivt som standard**: `activeFilter` starter allerede som `null`, og det nye kort har `status: null`, så det vil automatisk have `ring-2` styling ved indlæsning.

3. **Opdater `handleCardClick`**: Fjern toggle-logikken for `null`-kortet. Når "Alle forsendelser" klikkes, sættes `activeFilter` til `null`. De andre kort fungerer som hidtil (klik igen = tilbage til null/alle).

4. **Tilføj totalcount**: Tilføj en query for totalt antal ikke-arkiverede forsendelser til stats-queryen, eller beregn det som `stats.ny + afventer_scanning + ulaest + laest` (plus evt. andre aktive statuses).

5. **Opdater grid**: Ændre grid fra `md:grid-cols-4` til `md:grid-cols-5` for at rumme det femte kort.

### Visuelt resultat
```text
[Alle forsendelser] [Ny forsendelse] [Afventer scanning] [Scannet post] [Arkiveret]
      12                  1                 0                  0              0
```

