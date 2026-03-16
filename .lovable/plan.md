

## Problem

Den nuværende løsning er for kompleks: `create-tenant-user` genererer et recovery-link, sender det til `send-welcome-email`, som skal videregive det til skabelonen. Mange bevægelige dele der kan fejle.

## Enklere løsning: Brug `inviteUserByEmail` + branded invite-skabelon

Supabase `inviteUserByEmail()` sender automatisk invite-e-mailen via `auth-email-hook`, som allerede har Flexum-branding. Linket i e-mailen fører brugeren til at sætte sin adgangskode. Vi behøver blot at:

1. **Tilpasse invite-skabelonen** (`invite.tsx`) til at fungere som velkomst-e-mail med "Sæt din adgangskode"-tekst
2. **Forenkle `create-tenant-user`** — gå tilbage til `inviteUserByEmail()` for nye brugere
3. **Fjerne recovery-link logikken** fra `TenantsPage.tsx` — ingen separat welcome-email nødvendig ved oprettelse (invite-mailen ER velkomstmailen)
4. **Behold `send-welcome-email`** til manuel genafsendelse fra listen (uden recovery-link)

### Ændringer

| Fil | Ændring |
|---|---|
| `invite.tsx` | Omdøb til "Velkommen til Flexum" med tekst om postservice og "Sæt din adgangskode →" knap |
| `create-tenant-user/index.ts` | Brug `inviteUserByEmail()` igen i invite-mode. Fjern `generateLink`-logikken |
| `auth-email-hook/index.ts` | Opdater invite subject til "Velkommen til Flexum" |
| `TenantsPage.tsx` | Fjern recovery_links-logikken. Lad invite-mailen håndtere velkomst+adgangskode |

### Flow

```text
Operatør opretter lejer
        │
        ▼
create-tenant-user: inviteUserByEmail() 
        │
        ▼
auth-email-hook: sender branded invite-e-mail med "Sæt din adgangskode" knap
        │
        ▼
Lejer klikker → sætter adgangskode → logger ind
```

Én e-mail, ét system, ingen recovery-link-logik.

