# Fejl: Adresse linje 2 mangler på printede konvolutter

## Årsag
CardX har i databasen:
- `shipping_address` = tom
- `shipping_address_2` = "Vadbro 96, 1f"

`EnvelopePrint.tsx` modtager kun `shippingAddress` fra `ShippingPrepPage` og udskriver kun det felt. `shipping_address_2` bliver hverken videregivet eller printet, så hele vejnavn-linjen forsvinder på konvolutten. På skærmen vises begge linjer, derfor opdages fejlen først ved print.

Dette rammer alle lejere, der har udfyldt adresselinje 2 — ikke kun CardX.

## Løsning

1. **`src/components/EnvelopePrint.tsx`**
   - Udvid `EnvelopeGroup`-typen med `shippingAddress2: string | null`.
   - Render `shippingAddress2` som egen linje umiddelbart efter `shippingAddress` (samme stil som de øvrige linjer, tomme linjer skjules automatisk som i forvejen).

2. **`src/pages/ShippingPrepPage.tsx`**
   - Inkluder `shippingAddress2: group.shippingAddress2` når `EnvelopeGroup`-objekterne sendes videre til `<EnvelopePrint />` (felterne hentes og grupperes allerede, så det er kun mapping i print-payload).

Ingen ændringer i database, RLS, edge functions eller adresseskema. Eksisterende 6-linjers visning på skærmen forbliver uændret; konvolutten kan nu have op til 7 linjer (recipient, c/o, address, address 2, zip/city, state, country) — tomme linjer skjules.

## Verifikation
Print en testkonvolut for CardX og bekræft, at "Vadbro 96, 1f" nu fremgår mellem c/o-linjen og postnummer-linjen.

## Ud af scope
- Vi flytter ikke "Vadbro 96, 1f" fra `shipping_address_2` til `shipping_address` i CardX' record. Adressen er gyldig, og rettelsen skal virke for alle lejere der bruger felt 2.
