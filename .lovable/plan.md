
Problem
- Dit screenshot bekræfter, at gebyret faktisk bliver oprettet og webhooken kvitterer succes.
- Men payloaden viser stadig:
  - `planType: "Plan"`
  - `name: "Postgebyr: 50 kr. (brev) ..."`
- Det passer med den nuværende kode i `sync-officernd-charge/index.ts`, som stadig altid sender et hardcoded `name` og `description`, selv når der findes en matchet plan.
- Derfor er den tidligere løsning kun delvist rigtig: vi har fået plan-reference på, men vi sender stadig et “custom fee”-navn oveni. Det er sandsynligvis derfor visningen i OfficeRnD stadig ikke matcher det forventede.

Plan
1. Ret payloaden i `sync-officernd-charge`
   - Når en plan er fundet, skal funktionen ikke længere sende det hardcodede navn `Postgebyr: ...` som visningsnavn.
   - I stedet skal den enten:
     - bruge planens navn som titel, eller
     - undlade custom `name`, hvis OfficeRnD selv skal vise plan-navnet.
   - `mail_item_id` skal bevares til sporing, men flyttes til et felt der ikke overtager det synlige navn.

2. Gør webhook-match robust
   - `officernd-webhook` matcher i dag primært via `description`.
   - Når vi ændrer navn/description-formatet, skal webhooken i stedet prioritere match på `charge_id` og kun bruge tekst-match som fallback.
   - Det gør det sikkert at rydde op i display-felterne uden at ødelægge bekræftelsesflowet.

3. Udvid logningen, så problemet kan ses direkte i appen
   - Gem ekstra debug-data for hver sync, fx:
     - resolved plan name
     - OfficeRnD `plan`
     - OfficeRnD `planType`
     - valgt member-id
   - Vis de felter i `OfficeRnDSettingsTab`, så man kan se præcis hvordan OfficeRnD klassificerede gebyret.

4. Kør samme brev igen efter rettelsen
   - Markér den nuværende `confirmed` log for brev 2976 som `superseded`.
   - Kør sync igen med den rettede payload.
   - Verificér derefter, at den nye OfficeRnD-record ikke længere står med det gamle `Postgebyr...` navn som visningsnavn.

5. Ryd op i dubletter
   - Behold historikken i sync-loggen.
   - Slet gamle fejloprettede OfficeRnD-gebyrer manuelt efter den nye version er verificeret.

Tekniske detaljer
- Den konkrete kodeårsag til teksten du ser i screenshotet er de hardcodede felter i `sync-officernd-charge/index.ts`:
  - `name: Postgebyr: ...`
  - `description: Postgebyr: ...`
- Screenshotet viser samtidig, at webhook og oprettelse virker. Så problemet er nu ikke “om gebyret bliver sendt”, men “hvordan det bliver oprettet og vist”.
- Der er ingen åbenlys auth- eller RLS-fejl i den eksisterende backend-konfiguration for denne del; fokus bør være payload-shape, webhook-match og bedre debug-synlighed.
