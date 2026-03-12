

## Problem

Forsendelse nr. 2816 har `chosen_action: null` (ingen handling valgt endnu). ShippingPrepPage henter kun emner med `.eq("chosen_action", "send")` (linje 71). Derfor vises 2816 ikke, selvom lejeren ("brugerfirma"/Lite) har `default_mail_action: "send"` som standardhandling.

Kort sagt: Siden ignorerer lejeres standardhandling og viser kun emner hvor en **eksplicit** ekstra handling er valgt.

## Løsning

Udvid queryen til også at inkludere emner hvor `chosen_action` er `null` men lejerens `default_mail_action` matcher "send". Derefter i filtreringslogikken, brug den **effektive handling** (chosen_action ?? tenant default) til at afgøre om emnet skal vises.

### Ændringer i `src/pages/ShippingPrepPage.tsx`

1. **Query** (linje 68-73): Fjern `.eq("chosen_action", "send")` og hent også `default_mail_action` og `default_package_action` fra tenants-relationen. Filtrer i stedet client-side baseret på den effektive handling.

2. **Type** `MailItemWithTenant`: Tilføj `default_mail_action` og `default_package_action` felter.

3. **Mapping**: Beregn `effectiveAction` = `chosen_action ?? (mail_type === "pakke" ? default_package_action : default_mail_action)`.

4. **filteredItems**: Filtrer kun emner hvor `effectiveAction === "send"`.

5. **"Ekstra forsendelse"-logik**: Brug `chosen_action === "send"` (eksplicit valgt) til at afgøre om det er en ekstra forsendelse. Emner med `chosen_action: null` og `default_mail_action: "send"` bruger den normale tier-kadence.

```typescript
// Query: hent alle aktive emner med action "send" eller null (default kan være send)
const { data, error } = await supabase
  .from("mail_items")
  .select("id, stamp_number, mail_type, status, chosen_action, tenant_id, tenants(company_name, default_mail_action, default_package_action, tenant_type_id, tenant_types(name))")
  .not("tenant_id", "is", null)
  .in("status", ["ny", "afventer_handling", "ulaest", "laest"]);

// Mapping: beregn effectiveAction
const effectiveAction = item.chosen_action
  ?? (item.mail_type === "pakke"
    ? tenants?.default_package_action
    : tenants?.default_mail_action);

// filteredItems: kun vis "send"
if (effectiveAction !== "send") return false;

// Ekstra forsendelse = eksplicit chosen_action === "send" for Lite-brev
const isExtraShipment =
  item.chosen_action === "send" &&
  item.tenant_type_name.toLowerCase() === "lite" &&
  item.mail_type === "brev";
```

