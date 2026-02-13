

## 1. Slå "Ulæste breve" og "Læste breve" sammen til "Scannet post"

### Lejer-dashboard kort-ændringer

De nuværende 5 kort reduceres til 4:

| Før | Efter |
|-----|-------|
| Ny forsendelse | Ny forsendelse |
| Afventer scanning | Afventer scanning |
| Ulæste breve | **Scannet post** (sum af ulæst + læst) |
| Læste breve | *(fjernet, slået sammen ovenfor)* |
| Arkiveret | Arkiveret |

Kortet "Scannet post" viser summen `stats.ulaest + stats.laest`. Når man klikker på det, filtreres tabellen til forsendelser med status `ulaest` ELLER `laest`. Hver række beholder sin originale status-badge ("Ulæst"/"Læst") i status-kolonnen.

Grid ændres fra `md:grid-cols-5` til `md:grid-cols-4`.

---

## 2. Farver på tabelrækker (begge dashboards)

Forslag til farvepaletten baseret på forsendelsens stadie:

| Stadie | Baggrund (Tailwind) | Hvornår |
|--------|---------------------|---------|
| Ny / ikke tildelt | `bg-yellow-50` | Ingen handling valgt endnu -- kræver opmærksomhed |
| Afventer scanning | `bg-blue-50` | Lejer har bedt om scan, operatør har ikke scannet endnu |
| Scannet / Ulæst | `bg-green-50` | Scan klar, lejer har ikke åbnet |
| Læst | Ingen ekstra farve (standard hvid) | Lejer har åbnet -- ingen handling nødvendig |
| Send / Afhentning / Daglig | `bg-purple-50` | Anden handling valgt, afventer håndtering |
| Destruer | `bg-red-50` | Markeret til destruktion |
| Arkiveret | `bg-gray-50` | Afsluttet |

Farverne anvendes som betinget `className` på `TableRow` i begge dashboards. Mørk tilstand-varianter (dark:bg-xxx-950/30) tilføjes også for kontrast.

---

## Teknisk opsummering

### Filer der ændres

**`src/pages/TenantDashboard.tsx`**
- Fjern det separate "Læste breve"-kort, erstat med kombineret "Scannet post"-kort
- Tilføj ny filtertype `"scannet"` der matcher status `ulaest` eller `laest`
- Opdater grid til `md:grid-cols-4`
- Tilføj betinget baggrundfarve-logik på `TableRow` baseret på forsendelsens stadie

**`src/pages/OperatorDashboard.tsx`**
- Tilføj betinget baggrundfarve-logik på `TableRow` baseret på forsendelsens stadie (samme farveskema)

Ingen nye afhængigheder eller databaseændringer.

