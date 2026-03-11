

## Erstat virksomhedsvælger med kort/knapper med notifikations-badges

### Hvad ændres

Den nuværende dropdown-menu (`TenantSelector`) erstattes med synlige kort/knapper for hver virksomhed. Hvert kort viser virksomhedsnavnet og messenger-lignende notifikations-badges for:
- **Nye breve** (status `ny`)
- **Nye scannede breve** (status `ulaest`)

### Ændringer

| Fil | Ændring |
|---|---|
| `src/components/TenantSelector.tsx` | Redesign fra dropdown til kort-baseret layout med badges. Henter mail-tællere per tenant. |
| `src/pages/TenantDashboard.tsx` | Tilpas layout så TenantSelector vises over dashboard-indhold i stedet for inline i header. |

### TenantSelector nyt design

Horisontale kort/knapper med:
- Virksomhedsnavn
- Aktiv-markering (ring/border) på valgt virksomhed
- Rødt badge-tal for nye breve (status `ny`)
- Blåt badge-tal for ulæste scannede breve (status `ulaest`)
- Badges skjules hvis antal er 0

Komponent henter selv mail-tællere via en query der grupperer `mail_items` per `tenant_id` og status.

```text
┌─────────────────┐  ┌─────────────────┐
│  Firma 1    (2) │  │  Firma 2        │
│  ●aktiv     🔴  │  │            🔵1  │
└─────────────────┘  └─────────────────┘
```

### Implementering

```tsx
// TenantSelector henter counts per tenant
const { data: counts } = useQuery({
  queryKey: ["tenant-mail-counts", tenants.map(t => t.id)],
  queryFn: async () => {
    const { data } = await supabase
      .from("mail_items")
      .select("tenant_id, status")
      .in("tenant_id", tenants.map(t => t.id))
      .in("status", ["ny", "ulaest"]);
    // Gruppper per tenant_id og status
    return counts;
  },
});
```

Vises altid når der er 1+ virksomheder (ikke kun ved 2+), så brugeren altid ser sit firma-kort med badges.

