

## Flyt post-listen ind paa dashboardet og fjern "Post" menupunktet

### Oversigt
Post-listen fra `/mail`-siden flyttes ind paa operatoer-dashboardet, saa den vises under kortene naar et kort klikkes. "Post"-menupunktet fjernes fra sidebaren.

### Aendringer

**1. `src/pages/OperatorDashboard.tsx`**
- Aendr den filtrerede tabel (som allerede vises ved klik paa kort) til at bruge det rigere tabelformat fra MailPage med: Foto-thumbnail, Type, Lejer, Forsendelsesnr., Status, Modtaget
- Fjern den separate "fuld side"-visning (if-blokken der returnerer tidligt) -- vis i stedet tabellen under kortene paa samme side
- Naar et kort er valgt, vis kortets titel og tabellen under kort-raeekken. Klik paa samme kort igen for at skjule tabellen
- Importer ImageIcon og STATUS_LABELS fra MailPage-logikken
- Behold knapperne "Bulk upload" og "Registrer post" synlige hele tiden

**2. `src/components/AppSidebar.tsx`**
- Fjern "Post"-linjen (`{ title: "Post", url: "/mail", icon: Mail }`) fra `operatorItems`

**3. `src/App.tsx`**
- Fjern `/mail`-ruten og importen af `MailPage`

**4. `src/pages/MailPage.tsx`**
- Filen kan slettes da funktionaliteten nu lever i dashboardet

### Tekniske detaljer

**Dashboard layout efter aendringen:**
```text
[Header: "Operatoer-dashboard"  |  Bulk upload | Registrer post]

[Kort 1] [Kort 2] [Kort 3] [Kort 4] [Kort 5] [Kort 6]

--- Naar et kort er valgt: ---
[Tilbage-knap + "Ikke tildelt" overskrift]
[Tabel med Foto | Type | Lejer | Forsendelsesnr. | Status | Modtaget]
```

**Tabel-kolonner i den nye visning:**
- Foto (40x40px thumbnail eller placeholder-ikon)
- Type (Brev/Pakke badge)
- Lejer (virksomhedsnavn)
- Forsendelsesnr.
- Status (badge med dansk label)
- Modtaget (dato)

**Filer der aendres:**
- `src/pages/OperatorDashboard.tsx` (opdateret -- udvidet tabel)
- `src/components/AppSidebar.tsx` (opdateret -- fjern Post)
- `src/App.tsx` (opdateret -- fjern /mail route)
- `src/pages/MailPage.tsx` (slettet)

