

## Fix: Login-knap mangler i velkomst-e-mail

### Problem
Skabelonen (`welcome.tsx`) indeholder allerede knappen korrekt, men den sidst deployede version af Edge Function'en inkluderer sandsynligvis ikke den opdaterede skabelon. Edge Functions serverer den **sidst deployede** kode — ikke det der står i filerne.

### Løsning
Redeployere `send-welcome-email` Edge Function'en, så den bruger den nyeste version af `welcome.tsx`-skabelonen med login-knappen.

| Handling | Detalje |
|---|---|
| Deploy `send-welcome-email` | Sikrer at den opdaterede skabelon med `<Button>` er aktiv |

Ingen kodeændringer nødvendige — kun et redeploy.

