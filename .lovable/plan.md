

## Ny ekstra handling for Lite breve: "Standard forsendelse"

### Formål
Lite-lejere skal kunne vælge "Standard forsendelse" som ekstra handling for breve. Denne sender brevet på den normale Lite-kadence (første torsdag i måneden) med gebyr "0 kr. + porto" — i modsætning til "Send hurtigst muligt" som opgraderer til ugentlig kadence og koster 50 kr.

### Ændringer

**`src/pages/TenantDashboard.tsx`** — 5 steder:

1. **ACTION_LABELS** (linje ~34): Tilføj `standard_forsendelse: "Standard forsendelse"`

2. **getExtraActions** (linje 65-71): Tilføj `"standard_forsendelse"` til Lite breve-handlinger, så lejeren kan vælge den ved siden af "Send hurtigst muligt". Den skal være tilgængelig når default ikke er "send", og filtreres ud hvis allerede valgt.

3. **getActionLabel** (linje 77-83): Tilføj label for `standard_forsendelse` → `"Standard forsendelse"`

4. **getItemFee** (linje ~107): Tilføj case for `standard_forsendelse` → returner `"0 kr. + porto"`

5. **getStatusDisplay** (linje ~243): Tilføj case for `chosen_action === "standard_forsendelse"` → vis "Sendes" + første torsdag i måneden (bruger `getFirstThursdayOfMonth()`)

6. **getActionPrice** (linje ~149): Tilføj case for `standard_forsendelse` → returner `"0 kr. + porto"`

7. **handleAction** (linje ~498): `standard_forsendelse` skal behandles som en normal handling (ingen dialog), dvs. den falder igennem til `chooseAction.mutate()`

**`src/pages/OperatorDashboard.tsx`** — 3 steder:

1. **ACTION_LABELS**: Tilføj `standard_forsendelse: "Standard forsendelse"`

2. **getOperatorStatusDisplay** (linje ~92): Tilføj case for `standard_forsendelse` → vis "Skal sendes" + første torsdag i måneden

3. **getItemFee** (linje ~215): Tilføj check — hvis `chosen_action === "standard_forsendelse"`, returner `"—"` (ingen ekstra gebyr, det er standardkadencen)

4. **ACTION_TO_FEE_KEY**: Ingen tilføjelse nødvendig da gebyret er 0

**`src/pages/ShippingPrepPage.tsx`**: Tjek om `standard_forsendelse` skal inkluderes i forsendelsesfiltrering (sandsynligvis ja, da det er en forsendelseshandling).

