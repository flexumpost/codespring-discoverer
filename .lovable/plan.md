

## Problem

Koden i filerne er korrekt — `create-tenant-user` genererer et recovery-link og `send-welcome-email` sender det videre til skabelonen. Men den deployede version af edge functions matcher sandsynligvis ikke koden i projektet. Edge functions kører den sidst **deployede** version, ikke den seneste kode.

Billedet viser tydeligt at "Sæt din adgangskode"-knappen mangler, hvilket betyder at `recoveryLink` er `null` — enten fordi `create-tenant-user` ikke returnerer linket, eller fordi `send-welcome-email` ikke modtager det.

## Løsning

Gendeployér begge edge functions:

1. **`create-tenant-user`** — så den returnerer `recovery_link`
2. **`send-welcome-email`** — så den læser `recovery_links` fra request body og sender det til skabelonen

Ingen kodeændringer er nødvendige — kun redeployment.

