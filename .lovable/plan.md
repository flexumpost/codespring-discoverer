

## "Destruer" handling — komplet flow for lejer og operatør

### Oversigt

Tilføj "Destruer" som altid-tilgængelig handling for alle lejere (uanset tier). Handlingen er irreversibel og kræver bekræftelse. Operatøren ser "Skal destrueres" og kan bekræfte destruktion, hvorefter forsendelsen markeres som "Forsendelse destrueret".

### Ændringer

#### 1. TenantDashboard — Tilføj "destruer" til alle action-dropdowns

**`src/pages/TenantDashboard.tsx`**:
- I `getExtraActions()`: Tilføj `"destruer"` til alle returnerede arrays (alle tiers, alle branches), undtagen når `currentAction === "destruer"`.
- For pakker: Tilføj også `"destruer"` til listen.
- Opdater `getActionPrice()` til at returnere `"0 kr."` for `"destruer"` (gratis for alle tiers).
- Destruer-bekræftelsesdialogen eksisterer allerede (linje 1008-1034) og forbyder ikke ændring — opdater teksten til at understrege at handlingen **ikke kan ændres efterfølgende**.
- I "Annuller handling"-kolonnen: Skjul annuller-knappen når `chosen_action === "destruer"` (kan ikke ændres).
- I `getStatusDisplay()`: Teksten "Destrueret" returneres allerede for `chosen_action === "destruer"` (linje 306-308) — dette er korrekt.

#### 2. OperatorDashboard — Status og "Bekræft destruktion"

**`src/pages/OperatorDashboard.tsx`**:
- I `getOperatorStatusDisplay()`: Opdater `destruer`-casen til at skelne mellem "Skal destrueres" (afventer bekræftelse) og "Forsendelse destrueret" (bekræftet). Brug `status === "arkiveret"` som markør for bekræftet destruktion.
- I "Destrueres"-kortet: Opdater `countFilter` til kun at tælle items der endnu ikke er bekræftet destrueret (`chosen_action === "destruer" && status !== "arkiveret"`).

**`src/components/OperatorMailItemDialog.tsx`**:
- Tilføj en "Bekræft destruktion"-knap der vises når `item.chosen_action === "destruer"` og `item.status !== "arkiveret"`.
- Ved klik: Opdater status til `"arkiveret"` (markerer at destruktionen er gennemført).
- Når `item.chosen_action === "destruer" && item.status === "arkiveret"`: Vis badge "Forsendelse destrueret" og deaktiver alle redigeringsmuligheder.

#### 3. mailRowColor — Ingen ændring nødvendig
`destruer`-handlingen har allerede en rød baggrund (linje 18-20 i `mailRowColor.ts`).

### Filer
- **Ændret**: `src/pages/TenantDashboard.tsx` — "destruer" tilføjes til alle dropdown-lister, annuller-knap skjules, bekræftelsestekst opdateres
- **Ændret**: `src/pages/OperatorDashboard.tsx` — operator status skelner mellem "Skal destrueres" og "Forsendelse destrueret", countFilter opdateres
- **Ændret**: `src/components/OperatorMailItemDialog.tsx` — "Bekræft destruktion"-knap, låsning af redigering efter destruktion

