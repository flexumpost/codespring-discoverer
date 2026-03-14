

## Opdater farvekodning i `getMailRowColor`

### Ny logik (prioriteret rækkefølge)

| Kategori | Handlinger/status | Farve |
|---|---|---|
| **Destruer** | `chosen_action === "destruer"` | Rød (uændret) |
| **Færdig** (scannet/sendt/afhentet) | `scan_url` findes, eller `status === "laest"`, eller `chosen_action === "under_forsendelse"` | Grøn |
| **Skal scannes** | `chosen_action` er `"scan"` eller `"standard_scan"` (uden scan_url) | Blå (uændret) |
| **Skal sendes** | `chosen_action` er `"send"` eller `"standard_forsendelse"` | Orange (`bg-orange-200`) |
| **Skal afhentes** | `chosen_action` er `"afhentning"` eller `"anden_afhentningsdag"` | Lilla (`bg-purple-200`) |
| **Ikke tildelt** | `!tenant_id` | Gul (uændret) |
| **Ny/afventer** | Alt andet | Gul (uændret) |

### Fil
- `src/lib/mailRowColor.ts` — omskriv funktionen med den nye prioriterede logik.

Bruges af OperatorDashboard, TenantDashboard og ShippingPrepPage — ingen ændringer i disse filer.

