

## Problem: Scan-anmodning uden notifikation ved standardhandling

### Årsag
Lejeren TRUST BOX A/S har `default_mail_action: scan`. Når ny post oprettes, vises "Scan nu" automatisk som standardhandling — men `chosen_action` forbliver `null` i databasen. 

Notifikationssystemet reagerer kun på eksplicitte ændringer:
- DB-triggeren `notify_operator_on_scan_request` checker `NEW.chosen_action = 'scan'` — aldrig opfyldt
- Edge function `notify-scan-request` kaldes kun i `chooseAction.onSuccess` — aldrig kaldt
- Log-triggeren `log_mail_item_changes` logger kun ændringer i `chosen_action` — ingen ændring sker

Kort sagt: systemet behandler standardhandlingen som implicit, men notifikations- og log-systemet forventer en eksplicit handling.

### Løsning
Når en lejer har `default_mail_action: scan` (eller `default_package_action: scan` for pakker), og post oprettes med den pågældende lejer tildelt, skal systemet automatisk sætte `chosen_action = 'scan'` og `status = 'afventer_handling'` — så det eksisterende trigger- og notifikationssystem håndterer resten.

### Ændringer

**1. DB-trigger: Ny trigger `apply_default_action_on_insert`**
- Fires BEFORE INSERT on `mail_items`
- Når `tenant_id` er sat og `chosen_action` er null: slå lejerens `default_mail_action` / `default_package_action` op
- Hvis standardhandlingen er `scan` eller `send`: sæt `chosen_action` og `status = 'afventer_handling'` automatisk
- Dette sikrer at de eksisterende triggers (`notify_operator_on_scan_request`, `log_mail_item_changes`) automatisk reagerer

**2. DB-trigger: Ny trigger `apply_default_action_on_tenant_assign`**
- Fires BEFORE UPDATE on `mail_items`  
- Når `tenant_id` ændres (fra null til en lejer) og `chosen_action` stadig er null: anvend samme logik som ovenfor
- Dækker scenariet hvor post oprettes uden lejer og derefter tildeles

**3. Ingen kodeændringer i frontend**
- De eksisterende triggers håndterer notifikationer og logning, så ingen ændring er nødvendig i TenantDashboard

### Tekniske detaljer
En enkelt PL/pgSQL-funktion `apply_tenant_default_action()` bruges af begge triggers. Funktionen:
- Henter `default_mail_action` eller `default_package_action` fra `tenants` baseret på `mail_type`
- Sætter `NEW.chosen_action` og `NEW.status` hvis en relevant standardhandling findes
- Kører som SECURITY DEFINER for at kunne læse tenants-tabellen

