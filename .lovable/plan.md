

## Problemanalyse

Der er to separate problemer:

### Problem 1: Gebyr oprettes på forkert member
Koden bruger `GET /members?email=...` og tager blindt `members[0]`. Hvis OfficeRnD returnerer den personlige profil først (i stedet for organisations-/team-medlemmet), oprettes gebyret under den forkerte konto. Det forklarer hvorfor gebyret ikke ses under "De Personlige Hjælpere ApS".

### Problem 2: Gebyret er muligvis oprettet men ikke synligt
Sync-loggen viser `charge_id: 69d50b54593604e7e8ec6057` med status `confirmed` — gebyret **er** oprettet i OfficeRnD, men sandsynligvis under det forkerte member (personlig profil i stedet for organisation).

---

## Plan

### 1. Opdater member-lookup til at prioritere organisation/team-member

I `supabase/functions/sync-officernd-charge/index.ts`:

- Efter at hente `members` fra OfficeRnD, sortér resultaterne så members med et `team`-felt prioriteres over dem uden
- Hvis flere members har et team, vælg den første med team
- Log det valgte member's navn og team i console for debugging

```text
members = GET /members?email=xxx
  → filter: prioritér member med team/organization
  → fallback: brug første member hvis ingen har team
```

### 2. Tilføj logging af OfficeRnD member-response og charge-response

For at kunne debugge fremtidige problemer:
- Log det fulde member-array (navn, team, office) til console
- Log det fulde charge-response body til console
- Gem member-navn i `officernd_sync_log` (via `amount_text` eller et nyt felt)

### 3. Ryd op i duplikerede sync-log entries

Mail item 2976 har to entries: én med `status: success` (gammel) og én med `status: confirmed` (ny). Den gamle entry med `charge_id: created` bør markeres som `superseded` for at undgå forvirring.

---

### Teknisk ændring i member-lookup (sync-officernd-charge)

**Nuværende kode** (linje 204-217):
```typescript
const members = await memberRes.json();
const member = members[0]; // ← tager blindt første
```

**Ny kode**:
```typescript
const members = await memberRes.json();
// Prioritér member med team (organisation) over personlig profil
const teamMember = members.find(m => m.team);
const member = teamMember || members[0];
console.log(`Selected member: ${member.name} (team: ${member.team || 'none'}, id: ${member._id})`);
```

