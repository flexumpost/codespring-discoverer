## Forklaring

Forsendelse 3568 er et **brev** tilhørende en lejer af typen **Standard**, hvor lejerens `default_mail_action` er sat til `"scan"`.

Når et brev registreres uden at operatøren aktivt vælger en handling, sætter systemet automatisk `chosen_action = "standard_scan"` baseret på lejerens standardhandling. Det er præcis det, der er sket her — så adfærden er som forventet.

## Mulige næste skridt (ingen kode ændres endnu)

1. **Ingen ændring** — accepter at denne lejer får breve til scanning som standard.
2. **Skift lejerens standardhandling** for breve fra `"scan"` til `"send"` (forsendelse), så fremtidige breve automatisk går til forsendelse i stedet. Kan ændres af lejeren selv under Indstillinger → Automatisering, eller af operatøren.
3. **Skift handlingen på 3568 specifikt** — åbn forsendelsen og vælg en anden handling (f.eks. Forsendelse) manuelt.

Sig til hvis du vil have mig til at gøre én af disse — ellers er dette blot en forklaring.

&nbsp;

Næste skridt er nr. 2, men sørg også for at operatøren kan se dette når operatøren går ind på lejerens profil, så operatøren kan se og hjælpe lejeren med at ændre dette