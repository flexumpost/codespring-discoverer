# Krav til arkivering: handlingen skal være gennemført

## Problem
Lejere kan i dag arkivere en hvilken som helst forsendelse i status `ny`, `ulaest`, `laest` eller `afventer_handling` direkte fra detalje-dialogen i `TenantDashboard`. Det betyder at breve kan ende i arkiv uden at handlingen (send, scan, afhentning, destruktion) er gennemført.

## Regel for "gennemført"
Et brev/pakke betragtes som gennemført — og må arkiveres af lejeren — hvis mindst én af følgende gælder:

- `status` er `sendt_med_dao` eller `sendt_med_postnord` (afsendelse fuldført af operatør)
- `scan_url` er sat (scanning faktisk uploadet — ikke blot anmodet)

Bemærk: når en pakke/brev er **afhentet** eller **destrueret**, sætter systemet allerede `status = arkiveret` automatisk, så lejeren rammer aldrig manuel arkivering for de tilfælde. At blot have valgt `chosen_action = scan / afhentning / destruer / send` tæller ikke som gennemført.

## Ændringer

### `src/pages/TenantDashboard.tsx`

1. Erstat `canArchive`-blokken (linje 845-848):
   ```ts
   const isCompleted =
     !!selectedItem &&
     (selectedItem.status === "sendt_med_dao" ||
       selectedItem.status === "sendt_med_postnord" ||
       !!selectedItem.scan_url);
   const canArchive = !!selectedItem && selectedItem.status !== "arkiveret";
   ```
   Knappen vises stadig på alle ikke-arkiverede items, så vi kan vise en forklarende popup ved klik.

2. Tilføj lokal state + `AlertDialog` (shadcn) til at vise en "vælg/gennemfør handling først"-besked.

3. Arkivér-knappens `onClick`:
   - Hvis `isCompleted` → kald `archiveMutation.mutate(selectedItem.id)` som i dag.
   - Ellers → åbn forklarings-dialogen i stedet.

### i18n (`src/i18n/locales/da.json` + `en.json`)
Tilføj under `tenantDashboard`:
- `archiveBlockedTitle` — DA: "Handling skal gennemføres først" / EN: "Action must be completed first"
- `archiveBlockedMessage` — DA: "Forsendelsen kan først arkiveres når handlingen er gennemført — dvs. brevet er sendt, scannet, afhentet eller destrueret. Vælg en handling og afvent at den er udført." / EN: tilsvarende.
- `archiveBlockedAck` — "Forstået" / "Got it"

## Ud af scope
- Operator-flow (operatører må fortsat arkivere frit).
- Ingen DB-/RLS-ændringer; reglen håndhæves i UI for lejer-flowet, hvor knappen vises.
- Reaktivér-knappen ændres ikke.

## Verifikation
1. Forsendelse med status `ny`/`ulaest`/`laest` uden `scan_url` → klik Arkiver → popup vises, status uændret.
2. Forsendelse hvor lejer har valgt `chosen_action = scan` men intet scan endnu → popup vises.
3. Forsendelse med `scan_url` sat → Arkiver virker som før.
4. Forsendelse med status `sendt_med_dao` eller `sendt_med_postnord` → Arkiver virker som før.
