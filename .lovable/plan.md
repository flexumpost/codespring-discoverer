

## "Send breve og pakker" — ny operatørside

### Oversigt

Ny side `/shipping-prep` med menupunkt "Send breve og pakker" mellem Dashboard og Lejere i operatør-sidebaren. Siden giver overblik over forsendelser der skal sendes på en valgt forsendelsesdag, med mulighed for at afkrydse pakket post.

### Forsendelsesdags-logik (fra domain knowledge)

- **Standard/Plus breve + alle pakker**: Sendes førstkommende torsdag
- **Lite breve**: Første torsdag i måneden
- Datepicker lader operatøren vælge hvilken forsendelsesdag der klargøres til

### Ændringer

| Fil | Ændring |
|---|---|
| `src/components/AppSidebar.tsx` | Tilføj menupunkt "Send breve og pakker" med `Package` ikon, url `/shipping-prep`, mellem Dashboard og Lejere |
| `src/pages/ShippingPrepPage.tsx` | **Ny fil** — hovedsiden |
| `src/App.tsx` | Tilføj route `/shipping-prep` med ProtectedRoute |

### ShippingPrepPage design

1. **Header**: Titel + datepicker til valg af forsendelsesdag (default: næste torsdag)
2. **Tabs**: "Breve" / "Pakker" — vælg mellem mail_type `brev` og `pakke`
3. **Data**: Henter `mail_items` med `chosen_action = 'send'` og `tenant_id IS NOT NULL`, joinet med `tenants(company_name)` og `tenants(tenant_type_id)` + `tenant_types(name)` for at beregne forsendelsesdag
4. **Filtrering**: Vis kun forsendelser hvor den beregnede forsendelsesdag matcher den valgte dato
5. **Gruppering**: Forsendelser grupperes per virksomhed (tenant) med firma-navn som overskrift
6. **Hvert element**: Viser forsendelsesnr. + checkbox
7. **Checkbox-handling**: Når afkrydset → opdater `status` til `arkiveret` og sæt `chosen_action` til `under_forsendelse` (eller lignende markering) via Supabase update. Dette låser forsendelsen for lejeren.

### Beregning af forsendelsesdag

```typescript
function getNextShippingDate(tenantTypeName: string, mailType: string): Date {
  const now = new Date();
  if (mailType === 'pakke' || tenantTypeName !== 'Lite') {
    // Næste torsdag (day 4)
    const d = new Date(now);
    d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7 || 7));
    return d;
  }
  // Lite breve: første torsdag i måneden
  // ...
}
```

### UI-struktur

```text
┌──────────────────────────────────────────────┐
│ Send breve og pakker                         │
│ Forsendelsesdag: [📅 Torsdag 13. marts 2026] │
│                                              │
│ [Breve] [Pakker]                             │
│                                              │
│ ▸ Firma ABC                                  │
│   ☐ Nr. 1234                                 │
│   ☐ Nr. 1235                                 │
│                                              │
│ ▸ Firma XYZ                                  │
│   ☐ Nr. 1240                                 │
│                                              │
└──────────────────────────────────────────────┘
```

### Database

Ingen migrering nødvendig. Bruger eksisterende `mail_items.chosen_action = 'send'` og `status`. Når operatør checker en forsendelse af, opdateres status til `arkiveret` for at signalere at den er under forsendelse/afsendt.

