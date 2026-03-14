

## Vis operatør-noter på lejer-dashboardet i realtid

### Problem
Lejer-dashboardet henter data én gang og cacher det. Når en operatør tilføjer en note, opdateres cachen ikke, så noten vises ikke før lejeren genindlæser siden.

### Løsning

1. **Tilføj `refetchInterval` til tenant-mail query** — poll hvert 30. sekund for nye ændringer (simpel løsning der sikrer at noter og andre opdateringer vises hurtigt uden fuld realtime-opsætning).

2. **Hent friske data ved row-click** — Når lejeren klikker på en række, hent den seneste version af `mail_item` direkte fra databasen i stedet for at bruge den cachede version. Dette sikrer at noter, scan-status m.m. altid er opdateret i detalje-dialogen.

### Ændringer

**`src/pages/TenantDashboard.tsx`**:

- **Query (linje ~439)**: Tilføj `refetchInterval: 30000` for at polle hvert 30. sekund.

- **`handleRowClick` (linje ~578)**: Hent den aktuelle item direkte fra databasen:
  ```typescript
  const handleRowClick = async (item: MailItem) => {
    // Fetch fresh data for this item
    const { data: fresh } = await supabase
      .from("mail_items")
      .select("*, tenants(company_name)")
      .eq("id", item.id)
      .single();
    const current = fresh ?? item;
    setSelectedItem(current);
    // ... rest of logic uses 'current'
  };
  ```

### Filer
- **Ændret**: `src/pages/TenantDashboard.tsx`

