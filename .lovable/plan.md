# OfficeRnD v1 → v2 migration

## Baggrund

- App i OfficeRnD: **"Flexum Coworking Post"** har allerede korrekte v2-scopes (`flex.billing.charges.*`, `flex.billing.checkout.create`, `flex.billing.plans.read`, `flex.community.members.read`). Ingen ændringer i OfficeRnD-appens scopes nødvendige.
- "Pilotomail" og "OfficeRnD til Dinero" i deprecation-advarslen er separate v1-apps – ignoreres her.
- Årsag til 403/AccessDeniedError: koden kalder `/api/v1/...`, men token har `flex.*`-scopes → v1 afviser. Løsning = skifte til `/api/v2/...`.
- Alle vores poster (Brev forsendelse, Brev/pakke afhentning, Pakke håndtering, Scanning af brev, Pakke forsendelse – Lite/Standard/Plus) findes allerede som **One-off Plans** i OfficeRnD. Intet skal oprettes manuelt.

## Hvad ændres v1 → v2

| Område | v1 | v2 |
|---|---|---|
| Base URL | `/api/v1/<org>/...` | `/api/v2/<org>/...` |
| Find member | `GET /members?email=` (array) | `GET /members?email=` (`{ results, cursorNext, cursorPrev }`) |
| Find one-off plan | `GET /plans?name=` (array) | `GET /fees?name=` ELLER `GET /plans?name=` (cursor-respons) |
| Opret charge | `POST /charges {member, plan, price, name}` | `POST /checkout {fees:[{fee\|plan, quantity, name}]}` |
| Token | uændret (`/oauth/token`) | uændret |

Empirisk opslag: helper kalder først `/fees?name=…`. Hvis 0 hits, fallback til `/plans?name=…`. Den endpoint der gav hit, bestemmer felt-navnet (`fee` vs `plan`) i checkout-payload. Resultatet caches in-memory pr. invokation.

## Filer der ændres

- `supabase/functions/_shared/officernd.ts` (NY) – v2-helper: `getToken`, `findMemberByEmail`, `findItemByName` (fee→plan fallback + cache), `createCheckout`.
- `supabase/functions/sync-officernd-charge/index.ts` – brug helper, fjern v1-kald.
- `supabase/functions/sync-officernd-charge-batch/index.ts` – samme.
- `supabase/functions/officernd-webhook/index.ts` – evt. v2-tilpasning af payload-felter (tjekkes ved implementering; uændret hvis webhook-format ikke skifter).
- `supabase/functions/test-officernd-connection/index.ts` (NY) – kalder `getToken` + `findMemberByEmail` for valgt test-email + slår valgt fee-navn op. Returnerer status pr. trin.
- `src/components/operator/OfficeRnDSettingsTab.tsx` (eller eksisterende settings-komponent) – "Test forbindelse"-knap der kalder edge function og viser resultat.

Bevares uændret: "Betales af"-logik, retry, business rules omkring hvornår synkronisering trigges, `officernd_sync_log`-skrivning.

## Faser

**Fase 1 – Forberedelse (operator):**
- Bekræft at en kendt test-bruger findes i OfficeRnD (email matcher en lejer-kontaktmail).
- Ingen oprettelse af items nødvendig.

**Fase 2 – Kode-migration:**
- Implementér `_shared/officernd.ts`.
- Refaktorer `sync-officernd-charge` + `sync-officernd-charge-batch` til v2 + checkout-payload.
- Hård cutover – ingen v1-fallback i koden. Rollback sker via revision hvis nødvendigt.

**Fase 3 – Test & resync:**
- Deploy med `officernd_settings.enabled = false` for at undgå auto-trigger.
- Brug "Test forbindelse"-knappen → verificér token, member-opslag, fee-opslag.
- Aktivér `enabled = true`.
- Tilføj/brug eksisterende "Resend"-knap på fejlede `officernd_sync_log`-rækker til at køre dem igennem v2.

**Fase 4 – Webhooks (separat task, ikke i denne migration):**
- Verificér at `officernd-webhook` stadig modtager events i v2-format; håndteres som opfølgning.

## Risici

- **Pris-override (porto):** v2-checkout bruger fee'ens forud-definerede pris. Hvis koden i dag sender variabel porto, skal vi enten (a) acceptere fee-prisen som den er, eller (b) bekræfte at `price`-felt på checkout-fee accepteres som override. Afklares i Fase 2 ved første test mod sandkasse-charge; hvis override ikke virker, kommer det op som beslutning før vi går videre.
- **Webhook-payload-felter** kan have skiftet navne i v2 – verificeres i Fase 4.
- **Hård cutover** – revision-rollback hvis Fase 2 fejler i produktion.

## Teknisk note (checkout-payload)

```ts
// hit fra /fees:
{ fees: [{ fee: "<id>", quantity: 1, name: "<label>" }] }
// hit fra /plans (one-off):
{ fees: [{ plan: "<id>", quantity: 1, name: "<label>" }] }
// member tilknyttes via member-id på checkout-rod (felt verificeres mod v2-docs ved implementering).
```
