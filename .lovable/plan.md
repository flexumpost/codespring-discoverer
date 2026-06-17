# Plan: Rekommanderet kun for breve + farve når tildelt lejer

## B) Pakker kan ikke være "Rekommanderet"

**UI – `src/components/RegisterMailDialog.tsx`**
- Skjul checkboksen "Rekommanderet" når `mailType === "pakke"`.
- Tving `is_registered = false` ved gem, hvis mail_type er pakke (uanset hvad OCR foreslog).
- I OCR-handleren: ignorér `data.is_registered` for pakker (ingen toast, ingen state-opdatering).

**UI – `src/components/OperatorMailItemDialog.tsx`**
- Samme: skjul evt. Rekommanderet-felt for pakker.

**Dashboard – `src/pages/OperatorDashboard.tsx` (linje 690)**
- Vis kun "R"-badget hvis `item.mail_type !== "pakke" && item.is_registered`.

**Data-oprydning (migration / data-update)**
- Sæt `is_registered = false` på alle eksisterende `mail_items` hvor `mail_type = 'pakke'` (så #3414 og evt. andre ikke længere viser R).

**Database-guard (valgfri men anbefalet)**
- Tilføj CHECK constraint eller trigger på `mail_items`: hvis `mail_type = 'pakke'` så skal `is_registered` være `false`. Forhindrer fremtidige fejl-registreringer.

## A) Farve når lejer er tildelt men afventer handling

Lige nu: status=`ny`, ingen `chosen_action` → falder igennem til **gul** (samme farve som "ikke tildelt"). Lejer-tildelingen kan ikke ses på farven.

**To dele:**

1. **Status-opdatering** – `src/lib/mailRowColor.ts`
   - Ny regel før den nuværende "ikke tildelt"-regel:
     - Hvis `tenant_id` er sat, `chosen_action` er null, ingen `scan_url`, status er `ny` eller `afventer_handling` → returnér en ny farve (forslag: **lyseblå** `bg-sky-100 dark:bg-sky-900/30`), så det visuelt skiller sig fra ægte "ikke tildelt".
   - Beholder den eksisterende gule "ikke tildelt"-regel for items uden tenant.

2. **Backfill af eksisterende item #3414** (og lignende)
   - Ingen DB-ændring nødvendig — farven beregnes i frontend ud fra `tenant_id`. Når lejeren er tilknyttet, vil farven automatisk skifte fra gul til lyseblå efter denne ændring.

## Tekniske detaljer

- Filer der ændres:
  - `src/components/RegisterMailDialog.tsx`
  - `src/components/OperatorMailItemDialog.tsx`
  - `src/pages/OperatorDashboard.tsx`
  - `src/lib/mailRowColor.ts`
- Migration:
  - `UPDATE mail_items SET is_registered = false WHERE mail_type = 'pakke' AND is_registered = true;` (data-opdatering via insert-tool)
  - Valgfri CHECK constraint: `ALTER TABLE mail_items ADD CONSTRAINT packages_not_registered CHECK (mail_type <> 'pakke' OR is_registered = false);`

## Spørgsmål før jeg går i gang

1. Skal jeg tilføje **DB-constraint'en** der forhindrer pakker i nogensinde at få `is_registered = true`? (Anbefalet.)
2. Er **lyseblå** OK som farve for "tildelt lejer, afventer lejerens valg af handling", eller foretrækker du en anden (fx lyselilla, lysegrå)?
