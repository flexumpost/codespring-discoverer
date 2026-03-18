

## Fix: Header viser e-mail i stedet for fornavn

### Problem
Linje 10 i `AppLayout.tsx` læser `user?.user_metadata?.first_name`, men brugerens `user_metadata` i auth indeholder sandsynligvis ikke `first_name`. Fornavnet ligger i `profiles`-tabellen (`first_name`), ikke i auth metadata.

### Løsning
Hent `first_name` fra `profiles`-tabellen i stedet for at stole på `user_metadata`. To muligheder:

**Anbefalet:** Udvid `useAuth`-hooket til også at hente profil-data (eller i hvert fald `first_name`) fra `profiles`-tabellen, og eksponer det via context.

### Ændringer

**`src/hooks/useAuth.tsx`**
- Tilføj `firstName` til `AuthContextType`
- Når bruger er logget ind og rolle hentes, hent også `profiles.first_name` i samme flow
- Eksponer `firstName` via context

**`src/components/AppLayout.tsx`**
- Brug `firstName` fra `useAuth()` i stedet for `user?.user_metadata?.first_name`
- Fallback til e-mail hvis `firstName` er tomt

