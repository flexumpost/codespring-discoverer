

## Problem

Gebyret oprettes via OfficeRnD API (`POST /fees`) men returneres med `planType: "Plan"` — OfficeRnD behandler det som et plan-baseret gebyr. Da der ikke eksisterer en plan med navnet "Postgebyr..." i OfficeRnD, vises gebyret ikke under medlemmets "One-Off Fees".

Screenshots bekræfter: "No one-off fees to show" under Peter Pinkowsky, og ingen plan matcher "postgebyr" under Billing → Plans.

## Løsning

Tilføj `planType: "OneOff"` til API-kaldet, så OfficeRnD registrerer gebyret som et enganggebyr i stedet for et plan-baseret gebyr.

### Ændring i `supabase/functions/sync-officernd-charge/index.ts`

I charge-oprettelsen (linje 230-237), tilføj `planType`:

```typescript
body: JSON.stringify({
  member: memberId,
  office: memberOffice,
  name: `Postgebyr: ${amountText} (${item.mail_type}) [mail_item_id:${mailItemId}]`,
  description: `Postgebyr: ${amountText} (${item.mail_type}) [mail_item_id:${mailItemId}]`,
  price: amountKr,
  planType: "OneOff",
  date: new Date().toISOString(),
}),
```

### Verifikation

1. Deploy funktionen
2. Markér eksisterende confirmed-entry for brev 2976 som `superseded`
3. Kør sync manuelt og verificér at API-response nu viser `planType: "OneOff"`
4. Tjek at gebyret vises under Peter Pinkowskys "One-Off Fees" i OfficeRnD

