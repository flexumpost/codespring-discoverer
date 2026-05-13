## Årsag

I `src/pages/ShippingPrepPage.tsx` (linjer 362–384) filtreres forsendelser sådan:

```ts
const isExtraShipment =
  item.chosen_action === "send" &&
  item.tenant_type_name.toLowerCase() === "lite" &&
  item.mail_type === "brev";
const shipDate = isExtraShipment
  ? (isThursday(today) ? today : nextThursday(today))
  : getNextShippingDateForItem(...); // 1. torsdag i måneden for Lite
```

Problemet: Alle Lite-lejere har `default_mail_action = 'send'` i DB. Triggeren `apply_tenant_default_action` sætter automatisk `chosen_action = 'send'` på nye breve. Filteret kan derfor ikke skelne mellem:

- **Auto-anvendt standard** (`chosen_action='send'` sat af trigger) → skal sendes 1. torsdag i måneden
- **Ekstra forsendelse anmodet af lejer** (`chosen_action='send'` valgt manuelt af lejer ud over standarden) → skal sendes førstkommende torsdag

Resultatet: ALLE Lite-breve med default "send" behandles som ekstra forsendelse og dukker op hver torsdag.

Bekræftet: 20/20 viste Lite-lejere har `default_mail_action='send'`.

## Løsning

Behandl kun et brev som ekstra forsendelse, når lejer aktivt har anmodet om det — dvs. når brevet er markeret med `standard_forsendelse` betyder "send på næste planlagte dag", og `send` (forskellig fra default-mapping) betyder "send hurtigst muligt".

Da triggeren ikke i dag mapper `send`→`standard_forsendelse` for Lite-breve (modsat hvordan `scan`→`standard_scan` mappes), har vi to ækvivalente fixes:

### Fix (anbefalet): mappe default i trigger

Udvid `apply_tenant_default_action` så den for Lite-breve med default `send` sætter `chosen_action = 'standard_forsendelse'` (parallel til den eksisterende scan-mapping). Standard-tier beholder logikken som i dag (gratis hver torsdag), så for dem er der ingen forskel.

Opdater også eksisterende rækker:

```sql
UPDATE mail_items mi
SET chosen_action = 'standard_forsendelse'
FROM tenants t JOIN tenant_types tt ON tt.id = t.tenant_type_id
WHERE mi.tenant_id = t.id
  AND tt.name = 'Lite'
  AND mi.mail_type = 'brev'
  AND mi.chosen_action = 'send'
  AND mi.status IN ('ny','afventer_handling','ulaest','laest');
```

Efter det matcher filterets eksisterende `standard_forsendelse`-gren (`getNextShippingDateForItem` → 1. torsdag i måneden for Lite) korrekt, og kun lejer-initierede `send`-valg falder i "extra"-grenen.

### Pris/anden logik

`getShippingFee` håndterer allerede `standard_forsendelse` (0 kr. + porto for Lite/Standard) og adskiller "ekstra forsendelse" (`send` ≠ default → 50 kr. + porto for Lite). Ingen yderligere ændringer nødvendige.

## Filer

- `supabase/functions`-migration: opdatér `apply_tenant_default_action` + backfill UPDATE
- ingen frontend-ændringer nødvendige
