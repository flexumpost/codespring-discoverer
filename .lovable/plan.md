

## Opdater Kalender-layout og seed danske helligdage

### Ændringer

**1. Seed danske helligdage i databasen (migration)**

Indsæt alle faste og bevægelige danske helligdage for 2025-2027 i `closed_days`-tabellen med `ON CONFLICT DO NOTHING` så eksisterende data bevares:

- Nytårsdag (1. jan)
- Skærtorsdag, Langfredag, Påskedag, 2. påskedag (bevægelige)
- Store bededag (afskaffet fra 2024, men kan inkluderes for 2025 hvis ønsket — **springer over**)
- Kristi himmelfartsdag (bevægelig)
- Pinsedag, 2. pinsedag (bevægelige)
- Grundlovsdag (5. jun)
- Juleaftensdag (24. dec), Juledag (25. dec), 2. juledag (26. dec)
- Nytårsaftensdag (31. dec)

**2. Layout: kalender til venstre, liste til højre (`ClosedDaysCalendar.tsx`)**

Ændre layoutet fra vertikal stacking til et `flex`-layout med:
- Venstre side: Kalenderen
- Højre side: Scrollbar liste med alle registrerede lukkedage (dato + label + slet-knap)

### Filer
| Fil | Handling |
|---|---|
| Migration (SQL) | Seed danske helligdage 2025–2027 |
| `src/components/ClosedDaysCalendar.tsx` | Opdater layout til side-by-side |

