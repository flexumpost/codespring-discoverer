

## Ensret "Opret ny lejer"-dialogen i RegisterMailDialog

### Problem
Dialogen til oprettelse af ny lejer fra post-registreringen (RegisterMailDialog) har et forældet layout:
- Enkelt "Kontaktperson"-felt (splittes manuelt på mellemrum)
- Et "Adresse"-felt som ikke findes i TenantsPage-dialogen
- Mangler auto-invite-funktionalitet når e-mail er udfyldt

TenantsPage-dialogen har det korrekte format med separate fornavn/efternavn-felter og automatisk invitation.

### Ændringer

**`src/components/RegisterMailDialog.tsx`**

1. **Erstat state-variabler**: Skift `newTenantContact` og `newTenantAddress` ud med `newTenantContactFirstName` og `newTenantContactLastName`

2. **Opdater dialog-formularen** (linje 878-907): 
   - Erstat det enkelte "Kontaktperson"-felt med to felter i et grid: "Fornavn" og "Efternavn" (som i TenantsPage)
   - Fjern "Adresse"-feltet
   - Tilføj info-tekst når e-mail er udfyldt: "En invitation sendes automatisk til [email]"

3. **Opdater `handleCreateTenant`** (linje 131-157):
   - Brug de separate fornavn/efternavn-felter direkte i insert
   - Tilføj auto-invite via `create-tenant-user` edge function når e-mail er udfyldt (samme logik som TenantsPage)

4. **Opdater reset-logik** (linje 750-754): Nulstil de nye state-variabler ved åbning

