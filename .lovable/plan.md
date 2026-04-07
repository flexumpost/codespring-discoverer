

## Problem: Webhook kan ikke matche gebyret — to fejl

### Fejl 1: charge_id gemmes aldrig
OfficeRnD API returnerer et **array** `[{_id: "..."}]`, men koden læser `charge._id` (som om det var et objekt). Resultat: `charge_id = null` i sync_log. Webhook Strategy 1 fejler.

### Fejl 2: description med mail_item_id fjernes af OfficeRnD
Når en `plan`-reference bruges, overskriver OfficeRnD vores custom `description`. Webhook-payloaden indeholder dermed ikke `[mail_item_id:...]`. Strategy 2 fejler også.

### Også: planType er altid "Plan" med plan-reference
OfficeRnD sætter `planType: "Plan"` automatisk når en plan er tilknyttet — dette er forventet opførsel og gebyret bør stadig vises under "One-Off Fees" i OfficeRnD.

---

### Rettelser

**1. Fix array-response i `sync-officernd-charge/index.ts`** (linje 318-322)

Ændr fra:
```typescript
const charge = await chargeRes.json();
const preliminaryChargeId = charge._id || charge.id || null;
```
Til:
```typescript
const chargeRaw = await chargeRes.json();
const charge = Array.isArray(chargeRaw) ? chargeRaw[0] : chargeRaw;
const preliminaryChargeId = charge?._id || charge?.id || null;
```

Dette sikrer at `charge_id` korrekt udtrækkes og gemmes, så webhook Strategy 1 virker.

**2. Tilføj Strategy 3 i `officernd-webhook/index.ts`** — match på member + mail_item_id

Som ekstra fallback, brug `fee.member` fra webhook-payloaden til at matche mod `member_id` i sync_log, kombineret med `pending_confirmation` status og seneste entry. Dette dækker tilfælde hvor hverken charge_id eller description matcher.

**3. Deploy og re-kør**

- Markér den nuværende `pending_confirmation` entry som `superseded`
- Deploy begge funktioner
- Kør sync igen for brev 2976
- Verificér at `charge_id` nu gemmes korrekt og webhook matcher

### Tekniske detaljer

| Problem | Årsag | Fix |
|---------|-------|-----|
| `charge_id = null` | API returnerer array, kode forventer objekt | `Array.isArray()` check |
| Webhook match fejler | charge_id er null + description strippes af OfficeRnD | Fix charge_id + tilføj member-based fallback |
| `planType: "Plan"` | OfficeRnD tvinger dette med plan-ref | Forventet — bør stadig vise under fees |

