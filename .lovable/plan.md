

# Goer foto-kolonnen dobbelt saa bred og lad billedet fylde hele kolonnen

## Hvad aendres?
Grid-layoutet i dialogen aendres fra lige store kolonner (`grid-cols-2`) til en 2:1 fordeling, hvor foto-kolonnen er dobbelt saa bred som formular-kolonnen. Billedet saettes til at fylde hele kolonnens hoejde og bredde.

## Teknisk implementering

### Fil: `src/components/RegisterMailDialog.tsx`

1. **Grid-fordeling**: Aendr `grid grid-cols-1 sm:grid-cols-2` til `grid grid-cols-1 sm:grid-cols-3` og giv foto-kolonnen `sm:col-span-2` (2/3 af bredden) og formular-kolonnen `sm:col-span-1` (1/3 af bredden)

2. **Billede fylder kolonnen**: Tilfoej `h-full` paa foto-kolonnens wrapper og saet billedet til `w-full h-full object-contain` saa det fylder hele det tilgaengelige omraade

