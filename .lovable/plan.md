

## Opdel operatør-oprettelsen til fornavn og efternavn

### Ændring i `src/components/OperatorsList.tsx`

Erstat det enkelte `fullName`-felt med to separate felter: `firstName` og `lastName`.

**State-ændringer:**
- Fjern `fullName` state
- Tilføj `firstName` og `lastName` state

**Dialog-formular:**
- Erstat "Fulde navn"-inputfeltet med to felter: "Fornavn" og "Efternavn"

**Mutation:**
- Send `first_name: firstName, last_name: lastName` direkte i stedet for at splitte `fullName`

**Reset ved success:**
- Nulstil `firstName` og `lastName` i stedet for `fullName`

Én fil, ingen database-ændringer (edge function understøtter allerede `first_name`/`last_name`).

