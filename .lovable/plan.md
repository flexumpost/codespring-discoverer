# Forbrug pr. lejer — ny fane under Indstillinger

## Formål
Operatøren skal kunne se, hvad portoen koster pr. lejer, opdelt i hvad lejeren selv har betalt, og hvad Flexum har betalt (lejere med gratis porto: Plus, Executive, Professional, Standard). Listen sorteres efter højeste beløb under "Betalt af os".

## Udregning
- Kun forsendelser der er sendt (status sendt med DAO / PostNord) og hvor vægten/portoen er valgt (`porto_option` sat).
- Prisen slås op i den samme porto-prisliste (PORTO_MAP), som bruges ved afsendelse og i porto-oversigten — fx PLUS-brev 0-100 g = 28 kr., 100-250 g = 46 kr., DK-breve 25/39/62/105 kr., pakker DK/SE/PL m.m.
- **Betalt af lejer:** lejere uden gratis porto (Lite, Essential) — portoen er overført til OfficeRnD.
- **Betalt af os:** lejere med gratis porto (Plus, Executive, Professional, Standard) — portoen er valgt til oversigten, men ikke opkrævet.
- Beløb vises ekskl. moms, som priserne i PORTO_MAP.

## Ændringer

1. **Ny komponent `src/components/ConsumptionTab.tsx`**
   - Henter alle sendte forsendelser med `porto_option` + lejer og løsning (tenant type).
   - Grupperer pr. lejer: antal breve, antal pakker, sum "Betalt af lejer", sum "Betalt af os".
   - Tabel med kolonner: Lejer, Breve, Pakker, Betalt af lejer, Betalt af os — sorteret faldende efter "Betalt af os".
   - Totalrække nederst.
   - Datofilter (måned/alle) så man kan sammenligne med DAO-fakturaen pr. måned.

2. **`src/components/OperatorSettingsTabs.tsx`**
   - Ny fane "Forbrug pr. lejer" (`value="consumption"`) placeret efter "Porto".

3. **i18n** — danske/engelske tekster for fanen og kolonnerne.

## Tekniske detaljer
- Datakilder: `mail_items` (status, porto_option, tenant_id), `tenants` (company_name), `tenant_types` (name). Gratis-porto-tjek via `lettersPortoIncluded()` fra `src/lib/tiers.ts`.
- PORTO_MAP genbruges — flyttes til `src/lib/porto.ts` og importeres af PostageOverviewTab, ShippingPrepPage og den nye fane, så priserne kun vedligeholdes ét sted.
- Rent frontend: ingen database- eller funktionsændringer. RLS giver allerede operatører adgang til at læse mail_items.

## Begrænsning
Forsendelser sendt før vægt-valg blev påkrævet for gratis-porto-lejere har ingen `porto_option` og tæller derfor ikke med — oversigten bliver fuld dækkende fra nu af.
