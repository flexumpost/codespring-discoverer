## Mål

Noten om afvist scanning ("Scanning annulleret" + operatørens årsag) skal blive synlig for lejeren permanent på forsendelsen — også efter at handlingen er skiftet til "send"/forsendelse af operatøren ved afvisning, og også efter at lejeren selv vælger en ny handling. Lejeren skal kunne se årsagen, så de ikke bare vælger scanning igen.

## Ændringer

### 1. `src/components/OperatorMailItemDialog.tsx` — `handleRejectAction`
Ingen funktionel ændring i selve afvisningen (chosen_action sættes stadig til "send" ved scan-afvisning), men `action_rejected_reason` skal forblive intakt fremover. Markér `note_read = false` så lejeren får besked-prikken.

### 2. `src/pages/TenantDashboard.tsx` — `chooseAction` mutation (linje ~675)
Fjern `action_rejected_reason: null` fra opdateringen. Årsagen må aldrig nulstilles automatisk når lejeren vælger en ny handling — den skal blive der som en permanent log.

### 3. `src/pages/TenantDashboard.tsx` — visning af status (linje ~1018-1037 og `getStatusDisplay`)
I dag vises afvisnings-badge kun når `rejectedReason && !item.chosen_action`. Dette betyder at badgen aldrig vises efter en scan-afvisning (fordi `chosen_action` sættes til "send"), og forsvinder så snart lejeren vælger noget nyt.

Ny adfærd:
- Vis altid den normale statusbadge baseret på `chosen_action`/`status`.
- Hvis `action_rejected_reason` er sat, vis derudover en lille destruktiv "Scanning annulleret"-badge (med MessageSquare-ikon + tooltip indeholdende årsagen) under/ved siden af statusbadgen.
- Badgen vises uanset hvilken handling der nu er valgt — også efter lejeren har skiftet handling.

### 4. `src/pages/TenantDashboard.tsx` — handlingsvalg-UI
Hvis `action_rejected_reason` er sat, deaktivér "Scan"-knappen i handlingsvælgeren med en tooltip: "Scanning blev afvist af operatøren. Kontakt support for at vælge scan igen." Dette forhindrer at lejeren bare vælger scan igen efter en afvisning. (Operatør kan stadig manuelt vælge scan via operatør-dialogen.)

### Tekniske detaljer
- Ingen databaseændringer nødvendige — `action_rejected_reason` findes allerede og bevares nu permanent.
- Operatørens egne handlinger (fx ny scan-afvisning) overskriver naturligvis feltet med ny årsag.
- i18n-strenge tilføjes i `da`/`en` for tooltip på deaktiveret scan-knap.
