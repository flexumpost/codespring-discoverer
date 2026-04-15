

## Porto-omkostninger mangler for Rawa og Shinepro i OfficeRnD

### Årsag

I `sync-officernd-charge-batch` funktionen itereres der over lejere. Hvis OfficeRnD-memberlookup fejler eller ikke finder en member (ingen bruger med `kontakt@rawa.dk` / `liga.shinepro@gmail.com`), kører koden `continue` og springer hele lejeren over — **inklusiv porto-gebyrerne**. Der logges heller intet i `officernd_sync_log`, så fejlen er usynlig.

Begge lejere er Standard-tier med `chosen_action: under_forsendelse` → hovedgebyr = 0 kr. Men porto burde stadig overføres (Rawa: dk_0_100 = 18,40 kr., Shinepro: udland_0_100 = 46 kr.).

### Løsning

Opdater `sync-officernd-charge-batch/index.ts` med to ændringer:

**1. Log fejl i sync-loggen** når member-lookup fejler — i stedet for at `continue` stille og roligt:
- Indsæt en `officernd_sync_log` entry med `status: 'failed'` og en beskrivende `error_message` (fx "No OfficeRnD member found for kontakt@rawa.dk")
- Så operatøren kan se problemet i sync-loggen under indstillinger

**2. Undgå at skippe hele lejeren** — alternativt: forsøg at finde member via company name i OfficeRnD (søg på teams/companies) som fallback, eller log specifikt at porto blev sprunget over.

### Tekniske detaljer

I `sync-officernd-charge-batch/index.ts`, ændres linje ~244-263:

```typescript
// Nuværende: stille continue
if (!firstItem.contact_email) {
  console.error(`Tenant ${tenantId} has no contact_email, skipping`);
  continue;  // <-- springer porto over!
}
// ... member lookup ...
if (!members.length) {
  console.error(`No OfficeRnD member for ${firstItem.contact_email}`);
  continue;  // <-- springer porto over!
}
```

Ændres til at logge fejl i sync_log:

```typescript
if (!firstItem.contact_email) {
  for (const it of tenantItems) {
    await supabase.from("officernd_sync_log").insert({
      mail_item_id: it.id,
      status: "failed",
      error_message: "Tenant has no contact_email",
      amount_text: null,
    });
  }
  continue;
}
// ... og tilsvarende for member lookup failure
```

Derudover: de to lejere skal manuelt synces efter rettelsen, eller portoen skal tilføjes manuelt i OfficeRnD.

