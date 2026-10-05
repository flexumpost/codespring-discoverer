# Vægt på breve med gratis porto, til portooversigten

Breve til Plus, Executive, Professional og Standard skal også have valgt vægt, når de sendes. Valget opkræves ikke hos lejeren. Det bruges kun i porto-oversigten, så den kan sammenlignes med fakturaen fra DAO.

## Sådan kommer det til at virke

**Under "Send breve og pakker" (breve):**
- Vægtvalget vises nu for alle adresser, også når alle firmaer på adressen har gratis porto.
- Forsendelsen kan ikke låses, før der er valgt vægt.
- Plus og Executive sendes som PLUS-brev og får deres egne valg:
  - PLUS-brev 0-100 g: 28 kr.
  - PLUS-brev 100-250 g: 46 kr.
- Standard og Professional får de almindelige valg (DK 0-100 g osv., og Udland ved udenlandsk adresse).
- Har adressen både firmaer med betalt porto og firmaer med gratis porto, bruges de almindelige valg, ligesom i dag.
- Ved valget står der "inkluderet – opkræves ikke", når alle firmaer på adressen har gratis porto.

**Overførsel til OfficeRnD:** Uændret. Lejere med gratis porto får aldrig porto på brevene overført. Det håndteres i forvejen af overførslen, og det tjekker jeg igen.

**Porto-oversigten (Indstillinger → Porto):**
- To nye rækker under Breve: "PLUS-brev 0-100g" (28,00 kr.) og "PLUS-brev 100-250g" (46,00 kr.).
- Rækkerne DK 250-500 g og DK 500-1500 g tilføjes også. De kan vælges i dag, men tælles ikke med i oversigten.
- Breve fra alle løsninger tælles med, så totalen svarer til det, der er sendt.

## Åbne punkter (antagelser)
- PLUS-brev findes kun i Danmark. Sendes et Plus- eller Executive-brev til udlandet, vælges "Udland" (Global) som i dag.
- Priserne er uden moms ligesom på DAO-fakturaen.

## Teknisk
- `ShippingPrepPage.tsx`: fjern `hasNonPlus`-gaten for visning og validering af porto på brevgrupper. Hvis alle firmaer har `lettersPortoIncluded`, og nogen af dem er Plus/Executive (`baseTier === "Plus"`) og adressen er i DK, vis `plus_0_100` / `plus_100_250`. Ellers vis de eksisterende valg. Gem `porto_option` som i dag.
- `PostageOverviewTab.tsx`: tilføj `plus_0_100` (28), `plus_100_250` (46), `dk_250_500` (54) og `dk_500_1500` (72) til priser, labels og `LETTER_OPTIONS`.
- `sync-officernd-charge` og `-batch`: bekræft at brev-porto springes over ved `lettersPortoIncluded`. `plus_*` er ikke i `PORTO_MAP`, så den bliver aldrig overført. Ingen ændring i databasen.
