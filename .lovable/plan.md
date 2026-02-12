

# Goer fotokolonnen dobbelt saa bred som formularkolonnen

## Problem
Dialogen er `sm:max-w-4xl` (896px). Med formularkolonnen paa 400px faar fotokolonnen kun ca. 450px - altsaa naesten samme bredde. Brugeren oensker at fotokolonnen er dobbelt saa bred som formularkolonnen.

## Loesning
Oeg dialogens max-bredde saa der er plads til at fotokolonnen kan vaere ca. 800px bred, mens formularkolonnen forbliver 400px.

## Teknisk implementering

### Fil: `src/components/RegisterMailDialog.tsx`

1. **Oeg dialog max-bredde**: Aendr `sm:max-w-4xl` til `max-w-[1300px]` for at give plads til 800px foto + 400px formular + gap
2. **Behold alt andet**: Flex-layoutet og kolonne-klasserne forbliver uaendrede (`flex-1` for foto, `sm:w-[400px]` for formular)

Med 1300px total bredde minus padding og gap faar fotokolonnen ca. 800-850px, hvilket er dobbelt formularkolonnens 400px.

