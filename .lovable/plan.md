
## Omlayout af "Forsendelsesdetaljer"-popup til 2-kolonner

Ændrer popup-dialogen i lejer-dashboardet fra et enkelt-kolonne layout til et 2-kolonner layout, hvor billedet fylder venstre side og info fylder højre side.

### Ændringer i `src/pages/TenantDashboard.tsx`

**DialogContent** udvides fra `max-w-lg` til `max-w-4xl` for at give plads til 2 kolonner.

Indholdet ændres fra en enkelt `space-y-4` div til et `grid grid-cols-3 gap-6` layout:

- **Venstre kolonne (col-span-2)**: Viser forhåndsvisning af det scannede dokument (foto) i fuld størrelse
- **Højre kolonne (col-span-1)**: Viser alle info-felterne (Type, Forsendelsesnr., Afsender, Status, Valgt handling, Modtaget, Noter, Scanning/download)

### Tekniske detaljer

| Fil | Ændring |
|-----|---------|
| `src/pages/TenantDashboard.tsx` | Ændring af dialog-layout fra 1-kolonne til 2-kolonner (linjer 494-571) |

Strukturen bliver:

```text
+----------------------------------+------------------+
|                                  | Type: Brev       |
|                                  | Forsendelsesnr.  |
|   Forhåndsvisning af scannet     | Afsender         |
|   dokument (2/3 bredde)          | Status           |
|                                  | Valgt handling   |
|                                  | Modtaget         |
|                                  | Noter            |
|                                  | Download scan    |
+----------------------------------+------------------+
|          Arkiver  |  Luk                             |
+-----------------------------------------------------|
```

- `max-w-4xl` giver tilstrækkelig bredde til begge kolonner
- Billedet bruger `object-contain` og `max-h-[70vh]` for at passe inden for vinduet
- Info-felterne stables vertikalt (ikke i et 2-kolonne grid som nu) for bedre læsbarhed i den smallere højre kolonne
- Hvis der ikke er noget foto, vises kun info-kolonnen i fuld bredde
