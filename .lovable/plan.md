

## Udvid "Tildel lejer"-dialogen med fotovisning og OCR

Når operatøren klikker på en forsendelse uden tildelt lejer (eller vil skifte lejer), åbnes en udvidet dialog der viser forsendelsens foto og kan køre OCR for at hjælpe med at identificere modtageren.

### Ændringer i `src/components/AssignTenantDialog.tsx`

Dialogen udvides fra en simpel søge-dialog til en 2-kolonne dialog (ligesom RegisterMailDialog-mønsteret):

1. **Ny prop**: Modtager nu også `photoUrl` og `mailItem` (med stamp_number, sender_name) fra OperatorDashboard
2. **Venstre kolonne (2/3)**: Viser forsendelsens foto (`photo_url`) med mulighed for crop-OCR (drag-to-select) for lejer, forsendelsesnr. og afsender - genbruger samme mønster som RegisterMailDialog
3. **Højre kolonne (1/3)**: Indeholder den eksisterende lejer-søgning, OCR-resultater og "Opret ny lejer"-formular
4. **Auto-OCR**: Når dialogen åbnes med et foto, køres OCR automatisk for at finde modtager og foreslå en lejer-match
5. **Opdater flere felter**: Ud over `tenant_id` kan OCR-resultater også opdatere `stamp_number` og `sender_name` på forsendelsen

### Ændringer i `src/pages/OperatorDashboard.tsx`

- Send hele `mailItem`-objektet til AssignTenantDialog (i stedet for kun `mailItemId` og `currentTenantId`), så dialogen har adgang til `photo_url`, `stamp_number` og `sender_name`

### Tekniske detaljer

| Fil | Ændring |
|-----|---------|
| `src/components/AssignTenantDialog.tsx` | Udvid med foto-visning, OCR-integration, crop-funktionalitet og mulighed for at opdatere stamp_number/sender_name |
| `src/pages/OperatorDashboard.tsx` | Send hele mail-item objektet til AssignTenantDialog |

### Dialog-layout

```text
+----------------------------------+---------------------+
|                                  | [Søg lejer...]      |
|                                  |                     |
|   Foto af forsendelsen           | Firma A             |
|   (med drag-to-select OCR)       | Firma B    (aktuel) |
|                                  | Firma C             |
|   [Lejer] [Nr.] [Afsender]      |                     |
|   (crop-knapper under foto)      | [+ Opret ny lejer]  |
|                                  |                     |
+----------------------------------+---------------------+
|                        [Annuller]                      |
+--------------------------------------------------------+
```

### OCR-flow

1. Dialogen åbnes og viser fotoet i venstre kolonne
2. OCR køres automatisk og forsøger at matche modtageren med en lejer
3. Hvis match findes, fremhæves lejeren i listen med en "foreslået" badge
4. Operatøren kan klikke direkte på en lejer for at tildele
5. Alternativt kan operatøren bruge crop-knapperne til at markere specifik tekst på fotoet
6. Hvis der ikke er noget foto, vises kun lejer-søgningen i fuld bredde (som nu)

