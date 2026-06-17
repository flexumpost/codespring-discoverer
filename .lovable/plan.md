# Plan: Pakker skal altid auto-få "Forsendelse" som handling

## Diagnose af #3414

- `mail_type = 'pakke'`, `tenant_id` sat, `chosen_action = NULL`, `status = 'ny'`.
- Lejeren har `default_package_action = NULL` (124 ud af 218 lejere har NULL).
- Triggeren `apply_tenant_default_action` kører kun på INSERT, og selv hvis den kørte, ville den returnere uden ændring fordi `_default_action IS NULL`.
- Resultat: pakken får aldrig automatisk `chosen_action = 'send'`, falder igennem til den nye "lyseblå"-regel.

Forretningsreglen er klar: **pakker har altid "Forsendelse" som standard** (jf. `DefaultActionSetup.tsx` hvor `packageAction = "send"` er hardcoded). Så NULL skal behandles som `'send'` for pakker.

## Ændringer

### 1. Opdater trigger-funktion `apply_tenant_default_action`

- For pakker: hvis `default_package_action` er NULL/tom → brug `'send'` som fallback.
- Tilføj logik så funktionen også kører på **UPDATE** når `tenant_id` går fra NULL → ikke-NULL (i dag kører den kun på INSERT, så pakker der tildeles en lejer bagefter får ingen handling).

### 2. Tilføj/opdater trigger så den fyrer på både INSERT og UPDATE OF tenant_id

```sql
DROP TRIGGER IF EXISTS apply_tenant_default_action_trg ON mail_items;
CREATE TRIGGER apply_tenant_default_action_trg
BEFORE INSERT OR UPDATE OF tenant_id ON mail_items
FOR EACH ROW
WHEN (NEW.tenant_id IS NOT NULL AND NEW.chosen_action IS NULL)
EXECUTE FUNCTION apply_tenant_default_action();
```

(Det præcise trigger-navn verificeres i migrationen.)

### 3. Backfill af eksisterende pakker

```sql
UPDATE mail_items
SET chosen_action = 'send', status = 'afventer_handling'
WHERE mail_type = 'pakke'
  AND tenant_id IS NOT NULL
  AND chosen_action IS NULL
  AND status IN ('ny','afventer_handling')
  AND scan_url IS NULL;
```

Dette retter #3414 og lignende pakker, så de bliver fersken/peach (bestilt forsendelse) i stedet for lyseblå.

### 4. (Valgfri) Backfill `tenants.default_package_action`

Sæt `default_package_action = 'send'` for alle 124 lejere hvor det er NULL, så fremtidige UI-visninger er konsistente.

## Spørgsmål

1. Skal jeg også backfille `tenants.default_package_action = 'send'` for de 124 lejere med NULL? (Anbefalet — UI viser allerede "Forsendelse" som eneste valg.)
2. For breve på lejere med `default_mail_action = NULL` (55 stk.): skal lyseblå farve forblive (lejer mangler at vælge standard), eller skal vi tvinge dem ind i `DefaultActionSetup`-flowet næste gang de logger ind? (Ingen ændring foreslået nu — kun bekræftelse.)
