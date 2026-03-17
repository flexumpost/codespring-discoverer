

## Analyse: Onboarding-flow for nye lejere

### Nuværende flow (hvad koden gør i dag)

Når en operatør opretter en ny lejer via "Opret ny lejer"-dialogen:

```text
Operatør udfylder:             Backend-kæde:
┌──────────────────┐
│ Virksomhedsnavn* │
│ Kontakt-email    │──→ INSERT i tenants-tabellen
│ Lejertype*       │         │
│ ☐ Send velkomst  │         ▼
└──────────────────┘    Trigger: link_tenant_to_user()
                        (kobler user_id hvis email matcher eksisterende bruger)
                             │
                    ┌────────┴────────────┐
                    ▼                     ▼
            Email angivet?          Ingen email
                    │                     │
                    ▼                     ▼
         create-tenant-user          Hvis "Send velkomst"
         (mode: "invite")            er afkrydset → kalder
              │                      send-welcome-email
              ▼                      (kræver eksisterende bruger)
    inviteUserByEmail()
    → Auth-email-hook sender
      branded "Velkommen til
      Flexum" invitation
    → Bruger klikker link
    → /set-password side
    → Konto aktiv
```

### De to parallelle e-mail-spor

| Spor | Hvornår | Funktion | Indhold |
|------|---------|----------|---------|
| **Invitation** (auto) | Email angivet ved oprettelse | `create-tenant-user` → `inviteUserByEmail` → `auth-email-hook` (invite.tsx) | "Sæt din adgangskode" knap → `/set-password` |
| **Velkomst** (manuel) | Afkrydsningsfelt eller bulk-knap | `send-welcome-email` → Resend API (welcome.tsx) | Generel velkomst + "Log ind" knap (ingen password-link) |

### Problemer og uklarheder i nuværende flow

1. **Dobbelt-email risiko**: Hvis email er angivet OG "Send velkomst" er afkrydset, sendes invitationen automatisk (pga. email), men velkomst-mailen forsøges også (linje 147-149). Velkomst-mailen vil dog fejle for nye brugere, da den ikke indeholder et password-link.

2. **Velkomst uden bruger**: Hvis operatøren opretter en lejer uden email og senere tilføjer emailen via TenantDetailPage, udløses `link_tenant_to_user`-triggeren korrekt, men ingen invitation sendes automatisk. Operatøren skal manuelt sende velkomst-email fra oversigten.

3. **Checkbox er misvisende**: Afkrydsningsfeltet "Send velkomst e-mail" er kun relevant når der IKKE er en email (dvs. aldrig nyttigt), fordi med email sendes invitationen altid automatisk.

### Anbefalet ideelt flow

```text
Operatør udfylder dialog:
  Virksomhedsnavn, Kontakt-email, Lejertype
          │
          ▼
  1. INSERT tenant i databasen
          │
          ▼
  2. Trigger: link_tenant_to_user()
     (kobler automatisk til eksisterende auth-bruger)
          │
          ▼
  3. Har email? ──Nej──→ Færdig (lejer oprettet uden konto)
          │
         Ja
          │
          ▼
  4. Kald create-tenant-user (mode: "invite")
     → Tjekker om bruger allerede eksisterer i auth
     → Ny bruger: inviteUserByEmail → branded invitation
     → Eksisterende: link blot til tenant via tenant_users
          │
          ▼
  5. Bruger modtager email: "Velkommen til Flexum"
     med "Sæt din adgangskode →" knap
          │
          ▼
  6. Bruger klikker → redirectes til /set-password
     → Sætter password → logges ind → ser dashboard
```

### Konkrete forbedringer

1. **Fjern "Send velkomst"-afkrydsningsfeltet** fra oprettelsesdialogen. Invitationen sendes automatisk når email er angivet, og velkomst-mailen er kun relevant som genfremsendelse fra oversigten.

2. **Opdater UI-feedback**: Gør det tydeligt i dialogen at "Hvis du angiver en email, modtager lejeren automatisk en invitation."

3. **Undgå dobbelt-email**: Fjern fallback til `sendWelcomeMutation` i `onSuccess` (linje 147-149), da invitationen allerede dækker behovet.

4. **Markér `welcome_email_sent_at`** også ved invitation: `create-tenant-user` bør sætte `welcome_email_sent_at` på tenant-rækken efter succesfuld invitation, så oversigten viser korrekt dato.

### Opsummering

Flowet er: **Opret lejer → auto-invitation via email → bruger sætter password → konto aktiv**. Det vigtigste er at rydde op i den dobbelte email-logik og sikre at `welcome_email_sent_at` altid opdateres korrekt, uanset om det er en invitation eller en manuel velkomst-mail.

