

## Tilføj "Markér som sendt retur" operatørhandling

### Oversigt
Tilføj en ny status `sendt_retur` til `mail_status` enum og en ny operatørhandling "Markér som sendt retur". Forsendelsen forbliver synlig for lejeren men uden mulighed for handling. Samme princip gælder for alle andre operatørhandlinger (afhentet, destrueret, sendt) — forsendelsen skal forblive synlig i lejerens oversigt.

### Ændringer

**1. Database-migration**
- Tilføj `sendt_retur` til `mail_status` enum:
  ```sql
  ALTER TYPE public.mail_status ADD VALUE IF NOT EXISTS 'sendt_retur';
  ```

**2. `src/components/OperatorMailItemDialog.tsx`**
- Tilføj `sendt_retur` til operatørhandlings-select:
  ```
  <SelectItem value="sendt_retur">Markér som sendt retur</SelectItem>
  ```
- I `handleOperatorAction`: tilføj case for `sendt_retur`:
  ```typescript
  } else if (operatorAction === "sendt_retur") {
    updateData = { chosen_action: "sendt_retur", status: "sendt_retur" };
  }
  ```
- Tilføj labels og descriptions for `sendt_retur`.
- Tilføj `sendt_retur` til `isFinalized`-check (linje ~61):
  ```typescript
  const isSentRetur = item.status === "sendt_retur";
  const isFinalized = isDestroyed || isPickedUp || isSent || isSentRetur || item.status === "arkiveret";
  ```

**3. `src/pages/OperatorDashboard.tsx`**
- Tilføj `sendt_retur` til statuslabels:
  ```typescript
  sendt_retur: "Sendt retur",
  ```
- Tilføj `sendt_retur` til status-filteret i `refreshMail` query (`.or()`).
- Tilføj visning i `getStatusDisplay` for `sendt_retur`.

**4. `src/pages/TenantDashboard.tsx`**
- Tilføj `sendt_retur` til statuslabels.
- I handlingskolonnen: tilføj `sendt_retur` til `isSentWithDao`-check (eller separat), så lejeren kun ser "Arkivér"-knappen:
  ```typescript
  const isSentWithDao = item.status === "sendt_med_dao" || item.status === "sendt_med_postnord" || item.status === "sendt_retur";
  ```
- I statuskolonnen: vis "Sendt retur" som status-tekst.

**5. `src/lib/mailRowColor.ts`**
- Tilføj farve for `sendt_retur` (f.eks. grå eller orange):
  ```typescript
  if (item.status === "sendt_retur") {
    return "bg-orange-200 dark:bg-orange-900/40";
  }
  ```

### Tekniske detaljer
- Ny enum-værdi `sendt_retur` i `mail_status` — kræver kun en `ADD VALUE` migration.
- TypeScript-typen opdateres automatisk efter migration.
- Forsendelsen forbliver synlig for lejeren men med handlinger låst til kun "Arkivér" (samme mønster som `sendt_med_dao`).

