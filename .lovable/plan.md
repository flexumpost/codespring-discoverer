

## Operatør-handlinger i "Rediger forsendelse" dialog

### Oversigt
Tilføj tre nye operatør-handlinger i redigeringsdialogen, der giver operatøren mulighed for manuelt at opdatere status for forsendelser.

### Handlinger

| Handling | DB-ændring | Effekt for lejer |
|----------|-----------|-----------------|
| Afhentet | `chosen_action="afhentet"`, `status="arkiveret"` | Kun "Arkiver" tilgængelig |
| Destrueret | `chosen_action="destruer"`, `status="arkiveret"` | Kun "Arkiver" tilgængelig |
| Sendt | `status="sendt_med_dao"`, `chosen_action="under_forsendelse"` | Kun "Arkiver" tilgængelig |

Ingen database-migration nødvendig — `chosen_action` er et frit tekstfelt, og alle nødvendige statusser eksisterer allerede i `mail_status` enum.

### Ændringer

**1. `src/components/OperatorMailItemDialog.tsx`**
- Tilføj en ny sektion "Operatør handling" med en Select-dropdown og en "Udfør"-knap
- Valgmuligheder: "Markér som afhentet", "Markér som destrueret", "Markér som sendt"
- "Afhentet" sætter `chosen_action="afhentet"` + `status="arkiveret"`
- "Destrueret" sætter `chosen_action="destruer"` + `status="arkiveret"`
- "Sendt" sætter `status="sendt_med_dao"` + `chosen_action="under_forsendelse"`
- Hver handling kræver bekræftelse via AlertDialog
- Sektionen vises kun for forsendelser der ikke allerede er arkiveret/sendt

**2. `src/pages/OperatorDashboard.tsx`**
- I `getOperatorStatusDisplay`: tilføj check for `chosen_action === "afhentet"` → vis "Afhentet [dato klokkeslet]" med `updated_at`

**3. `src/pages/TenantDashboard.tsx`**
- I status-visning: tilføj check for `chosen_action === "afhentet"` → vis "Afhentet [dato klokkeslet]"
- Lejeren kan allerede kun "Arkivere" da status er `arkiveret`

