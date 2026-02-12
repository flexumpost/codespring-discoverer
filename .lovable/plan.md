
# Lejer-portal: Se post og vaelg handling

## Hvad det goer for lejeren
Naar en lejer logger ind, ser de en oversigt over al deres modtagne post. For forsendelser med status "ny" kan de vaelge en handling (f.eks. scan, videresend, opbevar, destruer, daglig) - men KUN de handlinger der er tilladt for deres lejertype. Naar en handling vaelges, skifter status til "afventer_handling".

## Overblik over aendringer

### 1. Ny side: `src/pages/TenantMailPage.tsx`
- Viser lejerens post i en tabel med kolonnerne: Foto, Type, Forsendelsesnr., Status, Handling, Modtaget
- Filtreringsmuligheder for status
- For post med status "ny": vis handlingsknapper baseret paa lejerens tilladte handlinger fra `tenant_types.allowed_actions`
- For post med valgt handling: vis den valgte handling som badge
- Klik paa et foto aabner det i stor visning

### 2. Opdater `src/pages/TenantDashboard.tsx`
- Tilfoej post-tabellen under statistik-kortene saa lejeren ser alt paa dashboardet
- Alternativt: link til den dedikerede post-side

### 3. Opdater navigation i `src/components/AppSidebar.tsx`
- Tilfoej "Min post" som separat side i tenant-menuen med url `/my-mail`

### 4. Opdater routing i `src/App.tsx`
- Tilfoej `/my-mail` route med `ProtectedRoute`

### 5. Ingen database-aendringer nødvendige
- RLS-politikker tillader allerede lejere at laese deres egen post (`tenant_id IN my_tenant_ids()`)
- RLS-politikken "Tenants update own mail action" tillader allerede lejere at opdatere deres egen post
- `chosen_action` og `status` felter findes allerede paa `mail_items`
- `tenant_types.allowed_actions` indeholder allerede de tilladte handlinger per type

## Tekniske detaljer

### `TenantMailPage.tsx` - Hovedkomponent
- **Hent lejerens tenant-data**: Query `tenants` med `user_id = auth.uid()` for at faa `tenant_type_id`
- **Hent tilladte handlinger**: Query `tenant_types` med det fundne `tenant_type_id` for at faa `allowed_actions`
- **Hent post**: Query `mail_items` med sortering og valgfri statusfiltrering (RLS sikrer kun egen post vises)
- **Handling-knapper**: For hver post med status "ny", vis knapper for de tilladte handlinger
- **Vaelg handling**: Update `mail_items` med `chosen_action` og saet `status` til `afventer_handling`
- Vis bekraeftelsesdialog foer destruering

### Handlings-labels paa dansk
- scan: "Scan"
- videresend: "Videresend"
- opbevar: "Opbevar"
- destruer: "Destruer"
- daglig: "Daglig scanning"
- prioritet: "Prioritet"
- retur: "Retur til afsender"

### Eksempel paa allowed_actions per type
- Lite: opbevar, destruer
- Standard: videresend, scan, opbevar, destruer
- Plus: videresend, scan, opbevar, destruer, prioritet
- Fastlejer: videresend, scan, opbevar, destruer, prioritet, daglig
- Nabo: opbevar
- Retur til afsender: retur
