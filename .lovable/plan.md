

## Goer lejer- og operatoer-dashboardet responsivt

### Problemet

Begge dashboards bruger brede tabeller (8-9 kolonner) uden nogen form for horisontal scroll eller mobil-tilpasning. Paa smaa skaerme flyder indholdet ud over skaermen eller bliver ulaeseligt.

### Loesning

Tilfoej responsiv haandtering paa begge sider med en konsistent tilgang:

---

### 1. Operatoer-dashboardet (`src/pages/OperatorDashboard.tsx`)

**Header-sektion (linje 137-146)**
- Tilfoej `flex-wrap` saa titel og knapper kan bryde over paa smaa skaerme
- Goer titlen mindre paa mobil: `text-xl md:text-2xl`

**Status-kort (linje 148)**
- AEndr grid fra `grid-cols-3 md:grid-cols-6` til `grid-cols-2 sm:grid-cols-3 md:grid-cols-6` saa de stacker bedre paa mobil

**Tabel (linje 173-233)**
- Pak tabellen i en `<div className="overflow-x-auto">` wrapper saa den kan scrolles horisontalt paa smaa skaerme
- Tilfoej `min-w-[700px]` paa selve `<Table>` elementet saa kolonnerne ikke klemmes sammen

---

### 2. Lejer-dashboardet (`src/pages/TenantDashboard.tsx`)

**Header-sektion (linje 359-366)**
- Tilfoej `flex-wrap gap-2` saa TenantSelector bryder ned under titlen paa mobil

**Stats-kort (linje 369)**
- AEndr fra `md:grid-cols-5` til `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` for bedre stacking

**Tabel (linje 399-495)**
- Pak tabellen i `<div className="overflow-x-auto">`
- Tilfoej `min-w-[800px]` paa `<Table>` elementet (lejer-tabellen har flere kolonner)

**Dropdown (linje 463)**
- AEndr `w-[180px]` til `w-[140px] sm:w-[180px]` for bedre plads paa smaa skaerme

---

### Teknisk opsummering

| Fil | AEndring |
|-----|---------|
| `OperatorDashboard.tsx` | flex-wrap header, grid-cols-2 kort, overflow-x-auto tabel |
| `TenantDashboard.tsx` | flex-wrap header, grid-cols-2 kort, overflow-x-auto tabel, responsiv dropdown |

Ingen nye komponenter eller afhaengigheder. Kun Tailwind-klasser tilfojes/aendres.

