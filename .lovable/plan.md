## Status: jo, spærringen er lagt ind

Kontrolleret i både kode og database:

- **Handlingsdialogen** (`src/pages/TenantDashboard.tsx`, linje 1392-1401): "Arkivér" udføres kun hvis forsendelsen er sendt (DAO/PostNord/retur), scannet, afhentet eller destrueret. Ellers vises spærre-boksen "Kan ikke arkiveres endnu".
- **Kortlogikken** (`src/lib/mailActions.ts`): arkiv-kortet tilbydes overhovedet kun for sendte/afhentede/scannede forsendelser.
- **Databasen**: lejere kan slet ikke ændre `status` — hverken via adgangsreglen på `mail_items` eller triggeren `enforce_tenant_mail_item_immutability`. Et forsøg afvises på serveren.

De 6 arkiverede breve uden behandling (nr. 3246, 3247, 3254, 3255, 3261, 2954) blev alle arkiveret af lejeren **den 20. maj 2026**, altså før spærringen blev indført. Efter den dato er alle arkiveringer i loggen foretaget af operatøren (rico@flexum.dk).

## To ting der stadig bør rettes

**1. Uoverensstemmelse i detalje-dialogen**

I den gamle detalje-dialog (linje 867-871) bruges en anden "færdig"-definition end i handlingsdialogen: den mangler `sendt_retur`, `afhentet` og `destruer`. Den er dermed *strengere* end nødvendigt — en lejer kan ikke arkivere et returneret eller afhentet brev, selvom det er færdigbehandlet.

Rettelse: udtræk "er færdigbehandlet"-tjekket til én fælles hjælpefunktion i `src/lib/mailActions.ts` (fx `isMailCompleted(item)`) og brug den begge steder, så reglen kun findes ét sted.

**2. De gamle fejl-arkiverede breve**

De 6 breve står stadig som arkiverede uden at være behandlet, og de forstyrrer operatørens tælling. Forslag: reaktivér dem (sæt status tilbage til `afventer_handling`) så de kan behandles normalt — eller lad dem ligge, hvis de reelt er afsluttet fysisk. Dette kræver din beslutning.

## Teknisk omfang

- `src/lib/mailActions.ts`: ny eksporteret `isMailCompleted(item)`.
- `src/pages/TenantDashboard.tsx`: begge steder (`isCompleted` og `__archive__`-grenen) bruger den nye funktion.
- Ingen ændringer i databasen er nødvendige — serverbeskyttelsen er allerede på plads.
