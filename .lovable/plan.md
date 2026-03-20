

## Skjul "Retur til afsender"-forsendelser fra operatør-dashboardet

### Oversigt
Forsendelser tilknyttet lejere af typen "Retur til afsender" skal filtreres fra i operatørens forsendelsesoversigt, da disse breve returneres og ikke er i operatørens besiddelse.

### Ændring

**`src/pages/OperatorDashboard.tsx`** — `refreshMail` funktionen (linje ~461-468)

Efter data hentes, filtrér poster fra hvor `tenants?.tenant_types?.name === "Retur til afsender"`:

```typescript
const refreshMail = async () => {
  const { data } = await supabase
    .from("mail_items")
    .select("*, tenants(company_name, default_mail_action, default_package_action, tenant_types(name))")
    .or("status.in.(ny,afventer_handling,ulaest,laest,sendt_med_dao,sendt_med_postnord,arkiveret)")
    .order("stamp_number", { ascending: false, nullsFirst: false });
  // Filtrér "Retur til afsender" lejere fra
  const filtered = (data ?? []).filter(
    (item) => item.tenants?.tenant_types?.name !== "Retur til afsender"
  );
  setMailItems(filtered);
};
```

Filtreringen sker client-side efter fetch, da tenant_types-relationen allerede er inkluderet i select. Ingen database-ændring nødvendig.

