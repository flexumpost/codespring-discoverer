## Mål

Når en operatør afviser en scan-handling, skal forsendelsen ikke ende uden handling (hvilket i dag blot nulstiller status og opdaterer scan-datoen i lejerens visning). Den skal automatisk få handlingen **"Sendes"** (`send`), så lejeren tydeligt ser at forsendelsen nu står til afsendelse.

## Ændring

I `src/components/OperatorMailItemDialog.tsx` → `handleRejectAction` (linjer 180–202):

I dag:
```ts
.update({
  chosen_action: null,
  action_rejected_reason: rejectReason.trim(),
  note_read: false,
  status: "ny",
})
```

Nyt — kun når den afviste handling var en scanning (`scan` eller `standard_scan`):
```ts
const wasScan = item.chosen_action === "scan" || item.chosen_action === "standard_scan";
.update({
  chosen_action: wasScan ? "send" : null,
  action_rejected_reason: rejectReason.trim(),
  note_read: false,
  status: wasScan ? "afventer_handling" : "ny",
})
```

For ikke-scan-afvisninger bevares nuværende adfærd (handling nulstilles til `ny`).

## Effekt

- Afvises fx forsendelse #3262 (scan), sættes `chosen_action = 'send'` og status = `afventer_handling`.
- Forsendelsen dukker straks op på "Send breve og pakker"-listen og behandles som almindelig forsendelse (porto/fakturering håndteres allerede af eksisterende logik for `send` ≠ default).
- Lejeren ser stadig afvisningsbegrundelsen via `action_rejected_reason`, men handlingen er nu "Sendes" i stedet for "Handling afvist".

## Filer

- `src/components/OperatorMailItemDialog.tsx` (kun frontend, ingen DB-ændringer)
