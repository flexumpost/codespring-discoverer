

## Problem: Forkert redirect-URL i invitationen

Kerneproblemet er at `create-tenant-user/index.ts` bruger `https://flexum.dk` som origin for redirect-URL'en, men appen kører på `https://post.flexum.dk`. Når Supabase's `/verify`-endpoint behandler invite-tokenet, redirecter den brugeren til `https://flexum.dk/set-password#access_token=...`. Hvis `flexum.dk` ikke serverer React-appen (eller redirecter til `post.flexum.dk` og dermed taber hash-fragmentet), ender brugeren aldrig på `/set-password` med gyldige tokens.

Hash-fragmenter (`#access_token=...`) sendes IKKE til serveren ved HTTP-redirects, så ethvert server-side redirect fra `flexum.dk` → `post.flexum.dk` vil miste tokenerne.

## Fix

**Fil: `supabase/functions/create-tenant-user/index.ts`**
- Linje 108: Skift `const origin = "https://flexum.dk"` til `const origin = "https://post.flexum.dk"`

Derefter redeploy `create-tenant-user`.

Det er hele rettelsen. Resten af flowet (SetPasswordPage parsing af hash-tokens, setSession, visning af password-formularen) fungerer korrekt — det er bare aldrig blevet nået fordi brugeren aldrig lander på den rigtige URL.

