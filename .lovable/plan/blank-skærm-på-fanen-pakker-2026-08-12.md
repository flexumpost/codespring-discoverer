# Blank skærm på fanen "Pakker"

## Årsag

I pakke-fanen vises en porto-dropdown pr. pakke. Hvis pakkens leveringsadresse er i et andet land end Danmark, indsættes et menupunkt med teksten "Kun Danmark understøttet" og en tom værdi. Den anvendte UI-komponent tillader ikke tomme værdier og kaster en fejl, der får hele siden til at gå ned — deraf den helt hvide skærm.

Derfor sker det kun, når der ligger mindst én udenlandsk pakke på den valgte forsendelsesdag; med kun danske pakker virker fanen fint.

## Rettelse

- Erstat det tomme menupunkt med en almindelig, ikke-klikbar tekstlinje i dropdownen ("Kun Danmark understøttet") i stedet for et valgbart punkt uden værdi.
- Samme tjek på brev-fanens porto-dropdown, så udenlandske breve ikke kan udløse samme nedbrud.
- Ingen ændringer i priser, porto-koder eller afsendelseslogik.

## Teknisk

- `src/pages/ShippingPrepPage.tsx` linje ~759: `<SelectItem value="" disabled>` fjernes; erstattes af en simpel `<div>`/label inde i `SelectContent`.
- Gennemgå de øvrige `SelectItem`-brug på siden for tomme `value`-props.
