# Fjern "Afhentning" som standardhandling overalt

## Problem
Trods reglen om at "Forsendelse" er eneste tilladte standard for pakker (og at "Afhentning" aldrig må være standard for breve heller), står der i databasen stadig lejere med `default_package_action='afhentning'` og `default_mail_action='afhentning'`. Triggeren `apply_tenant_default_action` anvender disse værdier ved registrering, hvilket gav forsendelse 3120 (Nero Trade) status "Afhentning bestilt" uden at lejeren har bestilt noget — og uden et `pickup_date`.

Derudover findes der i UI'et stadig en "send"-default som mapper til afhentning visse steder, samt at vi ikke har en database-spærre der forhindrer at "afhentning" gemmes som standard.

## Hvad der skal gøres

### 1. Database trigger – afvis "afhentning" som standard
Opdater `apply_tenant_default_action` så den **springer over** (returnerer NEW uændret) hvis lejerens default er `'afhentning'`. Så bliver nye mail_items oprettet med status `ny` og ingen `chosen_action`, og lejeren skal selv vælge handling + tidspunkt.

### 2. Database constraint – forhindre fremtidige fejlindtastninger
Tilføj en CHECK-trigger på `tenants` der afviser `UPDATE/INSERT` hvor `default_mail_action = 'afhentning'` eller `default_package_action = 'afhentning'`. Bruger validation trigger (ikke CHECK constraint) jf. projektreglerne.

### 3. Ryd op i eksisterende lejer-data
Sæt `default_mail_action = NULL` og `default_package_action = NULL` på alle lejere hvor værdien i dag er `'afhentning'`. Berører bl.a.:
- Nero Trade (mail = afhentning)
- Sjælland Entreprise og VVS (pakke = afhentning)
- Evt. flere – bekræftes ved kørsel.

### 4. Ryd op i forsendelse 3120 (og lignende åbne items)
For mail_items hvor `chosen_action = 'afhentning'` AND `pickup_date IS NULL` AND `status = 'afventer_handling'` AND oprettet inden for de sidste 7 dage:
- Nulstil `chosen_action = NULL`
- Sæt `status = 'ny'`
Så de dukker op hos lejeren igen og kræver et aktivt valg + tidspunkt.

### 5. UI-tjek (DefaultActionSetup)
Verificér at "Afhentning" ikke længere kan vælges i `DefaultActionSetup.tsx` for hverken breve eller pakker. Hvis den stadig er listed, fjern den fra dropdown-options.

## Tekniske detaljer

**Trigger-ændring (uddrag):**
```sql
-- Hvis default er 'afhentning', kræves manuelt valg + pickup_date
IF _default_action = 'afhentning' THEN
  RETURN NEW; -- bliver liggende som 'ny' uden chosen_action
END IF;
```

**Validation trigger på tenants:**
```sql
IF NEW.default_mail_action = 'afhentning' OR NEW.default_package_action = 'afhentning' THEN
  RAISE EXCEPTION 'Afhentning kan ikke vælges som standardhandling – lejer skal selv booke et tidspunkt';
END IF;
```

**Backfill data-fix** (via insert-tool, ikke migration):
- `UPDATE tenants SET default_mail_action = NULL WHERE default_mail_action = 'afhentning'`
- `UPDATE tenants SET default_package_action = NULL WHERE default_package_action = 'afhentning'`
- `UPDATE mail_items SET chosen_action = NULL, status = 'ny' WHERE chosen_action = 'afhentning' AND pickup_date IS NULL AND status = 'afventer_handling'`

## Filer der ændres
- Ny migration: trigger-opdatering + validation trigger
- Data-fix via insert-tool (UPDATE statements)
- Evt. `src/components/DefaultActionSetup.tsx` hvis "Afhentning" stadig vises som mulighed

## Effekt
- Forsendelse 3120 og lignende får nulstillet handling, så Nero Trade selv kan vælge afhentning + tid
- Ingen lejer kan fremover have afhentning som default
- Database afviser hvis nogen prøver at gemme det igen
