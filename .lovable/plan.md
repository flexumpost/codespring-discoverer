
## Fase 6 udvidelse: Scanning-workflow og dropdown-handlinger paa TenantDashboard

### Overblik

Denne aendring omhandler fire ting:

1. **Dropdown-menu til handlingsvalg** - Erstat de mange knapper i "Handling"-kolonnen med en "Vaelg handling" dropdown-menu
2. **Nyt "Afventer scanning" kort** - Tilfoej et nyt statuskort mellem "Ny forsendelse" og "Ulaeste breve"
3. **Status-flow for scanning** - Naar lejer vaelger "Aaben og scan", flyttes forsendelsen til "Afventer scanning" (status forbliver `afventer_handling`, filtreret paa `chosen_action = 'scan'`). Naar operatoer uploader PDF, saettes status til `ulaest`.
4. **Laest-markering kun ved scan-download** - Forsendelsen flyttes kun til "Laeste breve" naar lejeren aabner det scannede PDF-dokument, IKKE naar forsendelsens foto vises.

### Aendringer

**1. TenantDashboard.tsx - Dropdown-menu**
- Omdoeb kolonneoverskriften "Handling" til "Vaelg handling"
- Erstat knap-raekkerne med en Select-dropdown (fra shadcn/ui) der viser de tilladte handlinger
- Naar en handling vaelges, kaldes `handleAction` som foer
- Hvis handling allerede er valgt, vis den som et badge (uaendret)

**2. TenantDashboard.tsx - Nyt "Afventer scanning" kort**
- Tilfoej et nyt kort efter "Ny forsendelse" med ScanLine-ikon
- Filterstatus: viser forsendelser med `chosen_action === 'scan'` og `scan_url` er null (dvs. endnu ikke scannet)
- Opdater stats-query til ogsaa at taelle disse
- Opdater `FilterStatus` typen og filterlogikken

**3. Database-trigger aendring**
- Opdater den eksisterende `notify_tenant_on_scan` trigger saa den ogsaa saetter `status = 'ulaest'` naar `scan_url` opdateres (forsendelsen flyttes automatisk til "Ulaest post" naar operatoeren uploader scanningen)

**4. TenantDashboard.tsx - Laest-markering logik**
- Fjern auto-markering som laest ved `handleRowClick` (linje 170-175)
- Tilfoej markering som laest KUN naar brugeren klikker "Download scanning" knappen
- Foto-visning i detalje-dialogen skal IKKE udloese laest-markering

**5. Operator-notifikation ved scan-anmodning**
- Naar lejer vaelger "Aaben og scan", sender systemet en e-mail-notifikation til operatoeren. Dette kraever en edge function der sender e-mail. Da e-mail-afsendelse kraever en e-mail-tjeneste (f.eks. Resend), vil vi i foerste omgang oprette en database-notifikation til operatoeren (i notifications-tabellen) i stedet for en reel e-mail. E-mail kan tilfojes i en senere iteration.

### Teknisk plan

```text
1. SQL-migration:
   - Opdater notify_tenant_on_scan trigger:
     Naar scan_url aendres fra NULL til en vaerdi,
     saet ogsaa status = 'ulaest' paa mail_items raekken.
   - Opret ny trigger notify_operator_on_scan_request:
     Naar chosen_action saettes til 'scan',
     opret notifikation til alle operatoerer.

2. TenantDashboard.tsx:
   - Import Select-komponenter fra shadcn/ui
   - Tilfoej "afventer_scanning" som FilterStatus (custom filter, ikke DB-enum)
   - Nyt kort: { title: "Afventer scanning", icon: ScanLine, filter: scan+no_url }
   - Stats: taelling af forsendelser med chosen_action='scan' og scan_url IS NULL
   - Erstat knap-raekker med Select dropdown i Handling-kolonnen
   - Kolonne-overskrift: "Vaelg handling"
   - handleRowClick: fjern auto-laest markering
   - Download scanning knap: tilfoej markAsRead.mutate() efter aabning

3. Grid layout:
   - Aendr fra md:grid-cols-4 til md:grid-cols-5 for at passe 5 kort
```

### Resultat
- Lejere faar en ren dropdown til at vaelge handling
- "Afventer scanning" kort giver overblik over ventende scans
- Operatoerer faar besked naar en lejer anmoder om scanning
- Forsendelser flyttes automatisk til "Ulaest" naar scan uploades
- "Laest" markeres kun ved download af scannet dokument
