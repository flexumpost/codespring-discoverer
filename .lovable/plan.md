

# Behold formularkolonnens stoerrelse, goer kun fotokolonnen bredere

## Problem
Den nuvaerende loesning bruger `grid-cols-3` med `col-span-2` / `col-span-1`, hvilket deler den samme max-bredde (3xl) i tre dele. Det goer formularkolonnen smallere end den oprindelige stoerrelse.

## Loesning
Skift fra grid-layout til flexbox, hvor formularkolonnen faar en fast bredde (svarende til den oprindelige `sm:max-w-md` ca. 448px) og fotokolonnen fylder resten af pladsen. Dialogens max-bredde oeges til `sm:max-w-4xl` for at give plads.

## Teknisk implementering

### Fil: `src/components/RegisterMailDialog.tsx`

1. **Oeg dialog-bredde**: Aendr `sm:max-w-3xl` til `sm:max-w-4xl` for at give mere plads til fotokolonnen

2. **Skift til flex-layout**: Erstat `grid grid-cols-1 sm:grid-cols-3 gap-6` med `flex flex-col sm:flex-row gap-6`
   - Fotokolonnen: `flex-1 min-w-0 h-full` (fylder al tilgaengelig plads)
   - Formularkolonnen: `sm:w-[400px] sm:flex-shrink-0` (fast bredde, krymper ikke)

Dette sikrer at formularkolonnen beholder sin oprindelige stoerrelse, mens fotokolonnen bliver saa bred som muligt.

