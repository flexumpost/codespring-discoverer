# Hvorfor kan brev 11111 stadig arkiveres?

Den popup-spærring vi tilføjede sidst ligger kun på arkiver-knappen i **detalje-dialogen** (linje 1325-1340 i `src/pages/TenantDashboard.tsx`).

I selve **tabel-rækken** findes en separat arkiver-knap (linje 1096-1108) der vises når `scanExpired || isSentWithDao || isLockedForShipping` er sand. `isLockedForShipping` bliver sand så snart pakkedagen er nået for et "send"-brev — også selv om brevet endnu ikke er fysisk sendt (status er stadig `afventer_handling`, ikke `sendt_med_dao`/`sendt_med_postnord`). Knappen kalder `archiveMutation.mutate(item.id)` direkte uden `isCompleted`-tjek, så brev 11111 (afventer afsendelse) kan arkiveres derfra.

## Ændring

`src/pages/TenantDashboard.tsx`, række-knappen (linje 1096-1108):

1. Beregn samme `isCompleted` lokalt for rækken:
   ```ts
   const isCompleted =
     item.status === "sendt_med_dao" ||
     item.status === "sendt_med_postnord" ||
     !!item.scan_url;
   ```
2. Ændr `onClick`:
   - Hvis `isCompleted` → `archiveMutation.mutate(item.id)` som i dag.
   - Ellers → `setArchiveBlockedOpen(true)` (genbruger eksisterende popup og i18n-nøgler).

Knappen vises stadig i samme tilfælde som før, men klik på et ikke-gennemført brev åbner forklarings-popup'en i stedet for at arkivere.

## Ud af scope
- Detalje-dialogens arkiver-knap (allerede korrekt).
- Reaktivér-flow, operator-flow, DB/RLS.

## Verifikation
1. Brev 11111 (status `afventer_handling`, ingen `scan_url`) på/efter pakkedag → klik Arkiver i rækken → popup vises, status uændret.
2. Brev med `scan_url` (scan udløbet) → Arkiver i rækken virker som før.
3. Brev med status `sendt_med_dao` eller `sendt_med_postnord` → Arkiver i rækken virker som før.
