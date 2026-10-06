# Zoho og e-mail til operatøren ved alle adresseændringer

## Hvad der ændres
- Når en operatør ændrer en forsendelsesadresse, sker nu det samme som når lejeren gør det:
  1. Adressen bliver opdateret på kontoen i Zoho CRM.
  2. Der sendes en e-mail til kontakt@flexum.dk med den nye adresse. Mailen siger, om Zoho blev opdateret, eller hvorfor det ikke lykkedes.
  3. Lejeren får sin bekræftelse, ligesom nu.
- I operatørens mail står der også, om det var lejeren eller en operatør, der ændrede adressen.
- Beskeden under notifikationer i appen kommer stadig kun, når lejeren selv ændrer adressen. Den skal ikke vise dig dine egne ændringer.
- Når ændringen er lavet, sender jeg flowet igennem én gang for BBM Int. ApS. Så kan du se, om Zoho finder kontoen.

## Teknisk
- I `sync-address-to-zoho` fjernes kravet om `byTenant` for Zoho-opdateringen og operatørens mail. `by_tenant` bliver stadig gemt i loggen og vist i mailen som "Ændret af: lejer/operatør".
- Funktionen deployes, og der kører én test for BBM (aeb38c77-…).
- Reglen i AGENTS.md opdateres: Zoho og operatørens mail gælder alle ændringer, mens beskeden i appen kun gælder lejerens.
