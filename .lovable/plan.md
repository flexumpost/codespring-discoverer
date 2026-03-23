

## Analyse: Invite-link fører til login i stedet for "Sæt adgangskode"

### Problem
Invite-linket bruger `generateLink({ type: "invite" })`, men brugeren (`ph@orex.dk`) blev allerede oprettet med `invite_silent` mode, som sætter `email_confirmed_at` automatisk. Når Supabase's `/auth/v1/verify` endpoint modtager et invite-token for en bruger der allerede er bekræftet, fejler verifikationen — brugeren redirectes uden gyldige session-tokens (ingen `access_token` i URL-hash).

SetPasswordPage modtager derfor ingen tokens, viser "Indlæser..." og brugeren ender med at navigere til login manuelt.

**Dette rammer alle nye lejere** da de alle oprettes med `email_confirm: true` (bekræftet fra start), hvorefter invite-tokenet ikke kan "re-bekræfte" dem.

### Løsning
Skift fra `type: "invite"` til `type: "magiclink"` i `send-new-mail-email/index.ts`. Magic links:
- Virker for allerede bekræftede brugere
- Genererer gyldige session-tokens i redirect-URL'en
- Sender `access_token` i hash-fragment som SetPasswordPage forventer

### Ændringer

**`supabase/functions/send-new-mail-email/index.ts` (linje 145-149)**
- Ændr `type: "invite"` → `type: "magiclink"` i `generateLink`-kaldet
- Opdater `redirectTo` til at pege på `/set-password`

```typescript
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: "magiclink",
  email: tenant.contact_email,
  options: { redirectTo: `${origin}/set-password` },
});
```

**`supabase/functions/_shared/email-templates/welcome-shipment.tsx`**
- Opdater teksten "Linket er aktivt i 24 timer" til den korrekte gyldighedsperiode for magic links (1 time)

Deploy `send-new-mail-email` Edge Function efter ændringen.

### Bemærkning
Magic links har 1 times udløb (kortere end invites 24 timer). Hvis 24-timers gyldighed er vigtig, kan vi alternativt bruge `type: "recovery"` som også virker for bekræftede brugere, og ligeledes har 1 times udløb. Begge er bedre end `invite` som slet ikke virker for allerede bekræftede brugere.

For at opnå længere gyldighed kan vi justere Supabase auth-konfigurationen for magic link/OTP expiry.

