

## Forlæng magic link gyldighed til 24 timer

### Problem
Magic links har som standard 1 times gyldighed i auth-systemet. Velkomst-e-mailen til nye lejere bruger `type: "magiclink"`, så linket udløber efter 1 time.

### Løsning
Forlæng OTP/magic link udløbstiden i auth-konfigurationen fra 3600 sekunder (1 time) til 86400 sekunder (24 timer). Opdater også teksten i e-mail-skabelonen.

### Ændringer

1. **Auth-konfiguration** — Sæt `mailer_otp_exp` til 86400 (24 timer) via `configure_auth` værktøjet.

2. **`supabase/functions/_shared/email-templates/welcome-shipment.tsx` (linje 48)** — Ændr tekst:
   - Fra: `Linket er aktivt i 1 time.`
   - Til: `Linket er aktivt i 24 timer.`

3. **Deploy** `send-new-mail-email` for at opdatere skabelonen.

### Bemærkning
Denne ændring påvirker ALLE magic links og OTP-koder i systemet (inkl. password reset). Hvis password reset bør forblive på 1 time, er dette en afvejning. Alternativt kan vi skifte welcome-shipment til `type: "invite"` igen — men det virkede ikke for allerede bekræftede brugere. Den simpleste løsning er at sætte global OTP expiry til 24 timer.

