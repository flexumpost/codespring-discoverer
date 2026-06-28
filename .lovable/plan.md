# Forbedret handlingsvalg for lejere

Mål: gøre lejernes brev- og pakkeoversigt mere overskuelig ved at samle alle valgmuligheder bag én "Vælg handling"-knap og introducere brugerstyret automatisering under Indstillinger.

## 1. Ny "Vælg handling"-knap (lejer-oversigt)

I kolonnen **Handlinger** på lejerens brev/pakkeoversigt (`TenantDashboard.tsx`) erstattes de nuværende dropdowns/ikoner med én knap pr. række: **"Vælg handling"**. Knappen er altid synlig (også for behandlede, arkiverede og destruerede rækker).

Klik åbner et modal-vindue med **handlingskort** – ét kort pr. mulighed, elegant og moderne, og hvert kort bruger den farve der allerede er knyttet til handlingen (samme tokens som `mailRowColor.ts`/badges).

Hvert kort viser:
- Titel på handlingen
- Kort forklarende tekst (præcis ordlyd fra PDF, fx "Brevet scannes gratis på først kommende scanningsdag [dato]")
- Eventuel dato (scanningsdag, første torsdag i måneden, førstkommende torsdag, beregnet afhentningsdato fra eksisterende pickup-logik)
- Pris/gebyr beregnet via eksisterende `getActionPrice` og tier-regler (Lite/Standard/Plus uændret)
- En primær knap nederst (fx "Send på standard dag")

Den aktuelt valgte handling (hvis nogen) skjules fra kortlisten, præcis som beskrevet i PDF'en.

### Hvilke kort vises hvornår

**Breve – ubehandlet:**
- Standard scan (Lite, Standard) – gratis
- Scan nu (alle) – gebyr (gratis for Plus)
- Standard forsendelse (alle) – gratis + porto (porto gratis for Plus)
- Hurtig forsendelse (Lite) – gebyr + porto
- Standard afhentning (alle) – gratis, dato fra eksisterende pickup-logik
- Hurtig afhentning (alle) – gebyr (gratis for Plus)
- Destruktion (alle) – gratis

**Breve – behandlet (scannet, men ikke sendt/afhentet):**
- Standard forsendelse, Hurtig forsendelse (Lite), Standard afhentning, Hurtig afhentning, Destruktion

**Breve – sendt / afhentet / destrueret:** kun **Arkiver**.

**Breve – arkiveret:** samme muligheder som behandlet brev (genaktivering håndteres af eksisterende `reactivateMutation`).

**Pakker – ubehandlet:** Forsendelse, Afhentning, Destruktion (alle 3 koster gebyr som i dag, undtagen destruktion).

**Pakker – behandlet:** kun Arkiver.

Hvis lejer allerede har valgt en handling der endnu ikke er udført, åbnes samme popup, men det aktive valg skjules (fx valgt "Standard scan" → kortene viser alt undtagen "Standard scan").

### Datoer i kortene
- Standard scan: næste scanningsdag pr. tier
- Standard forsendelse: første torsdag i måneden via eksisterende `getNextShippingDate`
- Hurtig forsendelse: førstkommende torsdag
- Standard afhentning: dato fra **eksisterende pickup-scheduling-logik** (kalender/lukkedage – ikke hardcoded)
- Hurtig afhentning: tekst "afhentning skal bookes" + åbner eksisterende booking-flow

### Eksisterende knapper/dropdowns
Quick-actions, "Annullér valg"-knap, ad-hoc badges og inline dropdown i kolonnen fjernes – al interaktion sker via "Vælg handling". "Annullér valg" tilbydes som ekstra kort i popup'en når der er et aktivt, ikke-udført valg.

Arkiveringsvisningen (separat fane) er uændret – kun handlingskolonnen ændres.

## 2. Ny "Automatisering"-sektion under Indstillinger

Ny sektion i `SettingsPage.tsx` (kun for tenant-brugere), titel **"Automatisering"**, med tre radio-/select-valg for **breve**:
- Forsendelse (systemets nuværende standard)
- Scanning
- Afhentning

For **pakker** vises kun "Forsendelse" som låst værdi (uændret forretningsregel).

Valget skrives til `tenants.default_mail_action` (samme felt som `DefaultActionSetup` bruger) via eksisterende RLS-policies. Ingen DB-ændringer kræves.

Forklarende hjælpetekst pr. valg, fx: "Nye breve sættes automatisk til standard scanningsdag for din løsning – gratis. Du kan altid vælge en anden handling på det enkelte brev."

`apply_tenant_default_action`-triggeren i DB håndterer allerede valget korrekt og kræver ingen ændringer.

## 3. Uændret
- Gebyrer, porto-regler, tier-tilladelser
- Pickup-scheduling og kalender
- Arkiv-visning (fane findes allerede)
- Operator-portal
- Notifikationer og email-flows

## Teknisk

Filer der ændres:
- `src/pages/TenantDashboard.tsx` – udskift kolonne-render med `<ChooseActionButton />`
- Ny `src/components/ChooseActionDialog.tsx` – popup med handlingskort
- Ny `src/components/choose-action/ActionCard.tsx` – ét kort med farve, tekst, dato, pris, CTA
- Ny `src/components/choose-action/useAvailableActions.ts` – ren funktion der returnerer relevante handlinger ud fra (mail_type, status, chosen_action, scan_url, tenantTypeName, allowedActions)
- `src/pages/SettingsPage.tsx` – ny "Automatisering"-sektion
- i18n-nøgler tilføjes i `src/i18n/locales/da.json` og `en.json`

Ingen migrationer, ingen edge-function-ændringer.

## Spørgsmål jeg ikke afklarer her
- Præcis ordlyd af hjælpetekster i popup tager jeg fra PDF'en 1:1 (dansk). Engelske oversættelser skrives parallelt.
- Ikoner pr. kort: bruger eksisterende lucide-ikoner der allerede er knyttet til hver handling i koden i dag.
