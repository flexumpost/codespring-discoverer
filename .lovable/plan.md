

## Opdater "Scannet post"-kort og ulæst-farve

### 1. "Scannet post"-kort viser kun ulæste (`src/pages/TenantDashboard.tsx`, linje 356)

AEndr value fra `stats.ulaest + stats.laest` til kun `stats.ulaest`, saa kortet kun viser antallet af ulaeeste (nye scannede) breve.

**Foer:** `value: stats.ulaest + stats.laest`
**Efter:** `value: stats.ulaest`

### 2. Ulaeeste breve faar farven #fef18b (`src/lib/mailRowColor.ts`, linje 34-37)

AEndr baggrundfarven for status `ulaest` fra groen til den specifikke gule farve `#fef18b`.

**Foer:**
```text
if (item.status === "ulaest") {
  return "bg-green-200 dark:bg-green-900/40";
}
```

**Efter:**
```text
if (item.status === "ulaest") {
  return "bg-[#fef18b] dark:bg-yellow-700/50";
}
```

### Filer der aendres

| Fil | AEndring |
|-----|---------|
| `TenantDashboard.tsx` | Kort-vaerdi aendres til kun `stats.ulaest` |
| `mailRowColor.ts` | Ulaest-farve aendres fra groen til `#fef18b` |

