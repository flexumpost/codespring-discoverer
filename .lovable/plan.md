

## Fix: Scannede breve skal vises i "Scannet post"-kortet

### Problem
Scannede breve (med `scan_url`) vises ikke i "Scannet post"-kortet, fordi filteret kun kigger på `status = ulaest/laest`. Et brev der er scannet kan stadig have status `afventer_handling` i databasen. Derudover skal kortets tæller kun vise **ulæste** scannede breve (ikke læste).

### Ændringer i `src/pages/TenantDashboard.tsx`

**1. Stats-query (linje ~375-403)**: Tilføj en ny tæller for scannede breve — tæl items hvor `scan_url` ikke er null OG `status != arkiveret` OG `status = ulaest` (kun ulæste tælles). Erstat den nuværende `ulaest`-tæller i stats med denne.

```typescript
// Ny: Tæl kun ulæste scannede breve til kortet
const scannetRes = await supabase
  .from("mail_items")
  .select("id", { count: "exact", head: true })
  .eq("tenant_id", selectedTenantId!)
  .not("scan_url", "is", null)
  .eq("status", "ulaest");
```

Brug `scannetRes.count` i stedet for `ulaestRes.count` til `stats.ulaest` (som bruges af "Scannet post"-kortet).

**2. Filter-query for "scannet" (linje 420-421)**: Ændr filteret så det finder alle items med `scan_url` (ikke baseret på status), undtagen arkiverede:

```typescript
} else if (activeFilter === "scannet") {
  query = query.not("scan_url", "is", null).neq("status", "arkiveret");
}
```

Dette sikrer at breve med `scan_url` og status `afventer_handling`, `ulaest` eller `laest` alle vises under "Scannet post", mens kortets tæller kun viser de ulæste.

