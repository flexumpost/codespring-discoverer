## Hvorfor skete det

Alle 7 forsendelser har `porto_option = NULL` i databasen. På "Klargør forsendelse"-siden er porto-valget en dropdown pr. adressegruppe, men **der er ingen validering** — operatøren kan klikke "Send" uden at vælge porto, og koden skriver kun `porto_option` hvis et valg er foretaget:

```ts
if (porto) {
  await supabase.from("mail_items").update({ porto_option: porto }).eq("id", id);
}
```

Når `sync-officernd-charge-batch` derefter løber porto-loopet, springer den hver post over med `if (!portoOption) continue;` → ingen portopostering oprettes i OfficeRnD.

Hovedgebyret blev oprettet korrekt (det afhænger ikke af porto_option), så fakturaerne ligger der — bare uden porto.

---

## Plan

### Del 1 — Ret de 7 forsendelser nu

Jeg har brug for at vide hvilken porto-sats hver enkelt forsendelse skal have. Gyldige værdier (fra `PORTO_MAP` i edge-funktionen):

| Nøgle | Beskrivelse |
|---|---|
| `dk_0_100` | DAO DK 0–100 g · 18,40 kr. |
| `dk_100_250` | DAO DK 100–250 g · 36,80 kr. |
| `dk_250_500` | DAO DK 250–500 g · 54,00 kr. |
| `dk_500_1500` | DAO DK 500–1500 g · 72,00 kr. |
| `udland_0_100` | DAO Udland 0–100 g · 46,00 kr. |
| `udland_100_250` | DAO Udland 100–250 g · 92,00 kr. |

Bemærk: forsendelse **3410** (ERIK VILLIAM THOMSEN K/S) er **Plus**-tier, og Plus får ikke porto-postering (skip-regel i batch sync). Hvis du alligevel vil have porto påført denne, må reglen ændres — sig til.

Trin:
1. Du angiver porto_option for hver af de 6 ikke-Plus forsendelser (3398, 3403, 3407, 3408, 3409, 3411).
2. Jeg `UPDATE mail_items SET porto_option = …` for hver.
3. Jeg justerer `sync-officernd-charge-batch` så den **ikke** springer porto-loopet over når hovedgebyret allerede er synket (i dag rammer `continue;` i "all already synced"-grenen og hopper helt forbi porto). Efter rettelsen kører porto-loopet uafhængigt.
4. Jeg kalder `sync-officernd-charge-batch` igen for de 6 ID'er → porto-posteringer oprettes i OfficeRnD og logges i `officernd_sync_log`.

### Del 2 — Forhindre fremover

I `src/pages/ShippingPrepPage.tsx` på "brev"-fanen:
- Send-knappen disables (og viser tooltip) hvis nogen valgt forsendelse tilhører en adressegruppe uden porto valgt — undtaget Plus-tier-forsendelser (som per regel ikke har porto).
- Inline rød markering ved den adressegruppe der mangler porto, så det er tydeligt hvor klikket skal ske.

Ingen DB-constraint tilføjes — `porto_option` skal stadig kunne være NULL for Plus og for pakker uden porto.

### Tekniske noter

- Edge-funktion: ændring i `supabase/functions/sync-officernd-charge-batch/index.ts` — flyt porto-blokken ud af `else`-grenen, så den altid kører pr. tenant uanset om hovedgebyret blev sprunget over pga. idempotens.
- Frontend: ny `useMemo` der pr. valgt brev-ID slår op i `portoSelections[addrKey]` og returnerer en liste af manglende adressegrupper; knap disabled hvis listen ikke er tom.

---

**Næste skridt:** Skriv porto-koden for hver af de 6 forsendelser, fx:
```
3398: dk_0_100
3403: dk_100_250
3407: dk_0_100
3408: dk_0_100
3409: dk_250_500
3411: dk_0_100
```
Så kører jeg planen.