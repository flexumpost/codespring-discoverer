## Mål

Hver gebyrlinje, der oprettes i OfficeRnD, skal vise dato og forsendelsesnummer i selve linjebeskrivelsen, fx:

```
DAO Porto Danmark (0 - 100 g.) kr. 18,4 - 28-05-26 (12345)
```

## Baggrund / problem

Vi bygger allerede strenge som `${planName} - ${dato} (${stampNumber})` i `sync-officernd-charge` og `sync-officernd-charge-batch` og sender dem som `name`/`description` til `createFee(...)`. Men i `supabase/functions/_shared/officernd.ts` bygger `createFee` v2-payloaden som:

```ts
fees: [{ plan: input.item.id, date }]
```

`name` og `description` bliver derfor smidt væk, og OfficeRnD viser kun plan-navnet uden dato/nummer.

## Ændringer

### 1. `supabase/functions/_shared/officernd.ts`
- Udvid `CreateFeeInput` så `name` og `description` officielt indgår.
- Lad `createFee` lægge dem ind på hver fee-linje i v2 checkout-payloaden:
  ```ts
  fees: [{
    plan: input.item.id,
    date,
    ...(input.name ? { name: input.name } : {}),
    ...(input.description ? { description: input.description } : {}),
  }]
  ```
- Behold krav om `item.id` og `member` som i dag.

### 2. `supabase/functions/sync-officernd-charge/index.ts`
- Standardisér label-formatet til præcis det, brugeren ønsker:
  - Hoved-gebyr: `"${planName}${tenantLabel} - ${dateLabel} (${stamp_number})"`
  - Porto: `"${portoInfo.planName}${tenantLabel} - ${dateLabel} (${stamp_number})"`
- `dateLabel` fortsætter som `DD-MM-YY`.
- Hvis `stamp_number` mangler udelades `( ... )`-delen.
- `tenantLabel` (kun ved `billed_by_email`) bevares uændret.

### 3. `supabase/functions/sync-officernd-charge-batch/index.ts`
- Samme format for konsoliderede linjer, hvor flere forsendelser samles:
  - `"${planName}${tenantLabel} - ${dateLabel} (${nr1}, ${nr2}, ...)"`
- Gælder både hoved-gebyr og brev-porto-grupper. Pakke-porto (per-item) får et enkelt nummer.

### 4. Deploy og verificér
- Deploy `sync-officernd-charge` og `sync-officernd-charge-batch`.
- Kør en testforsendelse (eller bed bruger om at lave én), åbn fakturaen i OfficeRnD og bekræft at linjen viser fx `DAO Porto Danmark (0 - 100 g.) kr. 18,4 - 28-05-26 (12345)`.
- Hvis OfficeRnD v2 afviser `name`/`description` på fee-linjen: fald tilbage til at PATCH'e den oprettede fee bagefter (`PATCH /fees/{id}` med `{ description }`). Logges som separat trin uden at fejle hovedflowet.

## Ud af scope

- Ingen ændringer i fee-beregning, plan-matching, idempotens, UI eller priser.
- Ingen retroaktive ændringer af allerede overførte gebyrer.
