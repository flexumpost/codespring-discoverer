

## Problem: Hovedgebyr på 0 kr. oprettes i OfficeRnD

### Analyse
For brev-forsendelse med Standard-tier er hovedgebyret **0 kr.** (linje 74: `amountKr: 0, amountText: "0 kr. + porto"`). 

Skip-logikken på linje 244 tjekker:
```
if (amountKr === 0 && !amountText.includes("porto"))
```

Fordi `amountText` indeholder "porto", springer den **ikke** over — og opretter et meningsløst 0 kr.-gebyr ("Postgebyr: 0 kr. + porto (brev)") i OfficeRnD. Porto-gebyret oprettes korrekt separat længere nede.

### Fix

Ændr skip-logikken så den springer over hovedgebyret når `amountKr === 0`, uanset om teksten nævner porto. Porto håndteres allerede separat i koden (linje 360-430). Men porto-delen skal stadig køre, så vi skal omstrukturere flowet:

1. **Linje 244-252**: Når `amountKr === 0`, spring kun over **oprettelse af hovedgebyret** i OfficeRnD, men lad porto-koden køre bagefter.
2. Opdatér den eksisterende log-entry til `skipped_zero_fee` for hovedgebyret.
3. Porto-logikken fortsætter uændret og opretter sit eget gebyr.

### Berørt fil
| Fil | Ændring |
|-----|---------|
| `sync-officernd-charge/index.ts` | Ændr linje 244-252: skip hovedgebyr ved 0 kr men kør porto. Fjern den tidlige `return` og lad koden falde igennem til porto-sektionen. |

