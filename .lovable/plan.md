

## Tildel/skift lejer på forsendelser fra operatør-dashboardet

Tilføjer muligheden for at klikke på lejer-kolonnen i operatør-tabellen for at tildele eller skifte lejer på en forsendelse.

### Ny komponent: `src/components/AssignTenantDialog.tsx`

En dialog der åbnes når operatøren klikker på lejer-cellen i tabellen. Dialogen indeholder:

- Søgefelt til at finde lejere (filtrerer på firmanavn og kontaktperson)
- Liste over matchende lejere der kan klikkes på for at tildele
- Knap til at oprette ny lejer (åbner inline-formular ligesom i RegisterMailDialog)
- Gem-knap der opdaterer `tenant_id` på forsendelsen

Dialogen genbruger det samme mønster som lejer-søgningen i `RegisterMailDialog` med søgefelt og klikbar liste.

### Ændringer i `src/pages/OperatorDashboard.tsx`

- Tilføj state for den valgte forsendelse (`assignTenantItem`) og dialog-synlighed
- Gør lejer-cellen klikbar med en `cursor-pointer` og understregning/hover-effekt
- "Ikke tildelt" vises som et klikbart link med rød farve
- Eksisterende lejernavne vises med blå hover-effekt for at indikere de kan klikkes

### Tekniske detaljer

| Fil | Ændring |
|-----|---------|
| `src/components/AssignTenantDialog.tsx` | **Ny fil** - dialog til at søge og tildele lejer |
| `src/pages/OperatorDashboard.tsx` | Tilføj klikbar lejer-celle + state til dialog |

### AssignTenantDialog funktionalitet

1. Modtager `mailItemId`, `currentTenantId`, `open`, `onOpenChange`, og `onAssigned` som props
2. Henter aktive lejere fra databasen (samme query som RegisterMailDialog)
3. Søgefelt filtrerer listen med fuzzy match
4. Klik på en lejer kalder `supabase.from("mail_items").update({ tenant_id }).eq("id", mailItemId)`
5. Viser den nuværende lejer med et markeret badge, hvis der allerede er tildelt en
6. Mulighed for at oprette ny lejer inline (samme mønster som RegisterMailDialog)
7. Efter tildeling kaldes `onAssigned()` callback, som trigger `refreshMail()`

### UI-flow

```text
Operatør klikker "Ikke tildelt" eller lejer-navnet
         |
         v
+---------------------------+
| Tildel lejer              |
|                           |
| [Søg lejer...          ]  |
|                           |
| Firma A                   |
| Firma B         (aktuel)  |
| Firma C                   |
|                           |
| [+ Opret ny lejer]        |
|                           |
|        [Annuller]          |
+---------------------------+
```

- Klik direkte på et firma-navn tildeler lejeren og lukker dialogen
- Den aktuelle lejer er markeret med "(aktuel)" badge
- "Opret ny lejer" åbner inline-formular med firmanavn, kontakt, e-mail, adresse og lejertype

