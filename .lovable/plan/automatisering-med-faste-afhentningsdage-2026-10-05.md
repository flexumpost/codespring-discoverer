# Automatisering med faste afhentningsdage

## Det bygger jeg
- Vis automatisering som to tydelige bokse side om side, når pladsen tillader det: **Breve** med brev-ikon og **Pakker** med pakke-ikon.
- Lad boksene skifte til én kolonne på smalle skærme.
- Når **Afhentning** vælges, kræv både en fast gratis ugedag og et fast tidsrum.
- Vis **Mandag** og **Torsdag** for Standard, Professional, Plus og Executive; vis kun **Torsdag** for de øvrige løsninger.
- Brug samme valg og regler for både breve og pakker.
- Gem valgene på lejeren, så både lejer og operatør ser og ændrer de samme indstillinger.

## Teknisk
- Tilføj separate felter til den eksisterende lejerindstilling for brev- og pakkeafhentningsdag.
- Opdatér kontrollen i databasen, så afhentning ikke kan gemmes uden en tilladt dag og et gyldigt tidsrum.
- Opdatér automatisk behandling af ny post, så næste forekomst af den valgte ugedag bruges, med respekt for lukkedage og 2-timers buffer.
- Bevar **Forsendelse** som standard for lejere uden et tidligere valg.
- Kontrollér den brede og smalle visning samt gemning af dag og tidspunkt.
