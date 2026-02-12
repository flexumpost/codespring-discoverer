

## Fase 3: Lejer-portal -- komplet plan

### Status: Hvad er allerede implementeret?
Lejer-dashboardet (`TenantDashboard.tsx`) har allerede en solid base:
- Statistik-kort med filtrering (ny, ulaest, laest, arkiveret)
- Post-tabel med foto, type, forsendelsesnr., status, handlinger, modtaget-dato
- Handlingsvalg baseret paa lejertype (allowed_actions)
- Foto-preview dialog
- Bekraeft-destruering dialog

### Hvad mangler?

**1. Indstillinger-side (`/settings`) -- sidebaren linker til den, men den eksisterer ikke**
- Opret `src/pages/SettingsPage.tsx` med lejerens profil-info (navn, email, virksomhed)
- Vis lejertype (Lite, Standard, Plus osv.) som read-only badge
- Mulighed for at opdatere `contact_name` og `contact_email` paa `tenants`-tabellen
- Tilfoej ruten i `App.tsx`

**2. Detaljevisning for enkelt forsendelse**
- Klik paa en raekke i tabellen aabner en dialog med fuld info:
  - Stort foto (hvis tilgaengeligt)
  - Type, forsendelsesnr., afsender, status, valgt handling
  - Modtaget-dato
  - Noter fra operatoer
- Naar en lejer aabner en forsendelse med status "ny" eller "ulaest", opdateres status automatisk til "laest"

**3. Markering som laest (statusovergang)**
- Naar lejeren aabner en forsendelse, kald en mutation der opdaterer status:
  - "ny" -> "laest" (hvis ingen handling er valgt endnu, forbliv "ny" men vis som laest visuelt, eller skift til "ulaest" foerst)
  - "ulaest" -> "laest"
- Invalidate stats og mail-queries

**4. Arkivering**
- Tilfoej en "Arkiver" knap i detaljevisningen for forsendelser med status "laest" eller "afventer_handling"
- Opdaterer status til "arkiveret"

### Tekniske detaljer

**Ny fil: `src/pages/SettingsPage.tsx`**
- Hent lejer-data via `supabase.from("tenants").select("*, tenant_types(name)").eq("user_id", user.id)`
- Formular med `contact_name`, `contact_email` felter
- Gem-knap der kalder `supabase.from("tenants").update(...)` 
- Wrapped i `AppLayout`

**Opdatering: `src/App.tsx`**
- Tilfoej route: `<Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />`

**Opdatering: `src/pages/TenantDashboard.tsx`**
- Tilfoej state `selectedMailItem` for detalje-dialog
- Klik paa raekke aabner dialog (ikke kun foto-klik)
- Ved aabning: kald mutation til at opdatere status til "laest" hvis "ny" eller "ulaest"
- Tilfoej "Arkiver" knap i detalje-dialogen
- Tilfoej visning af afsender (`sender_name`) og noter (`notes`) i detalje-dialog

**Filer der aendres/oprettes:**
- `src/pages/SettingsPage.tsx` (ny)
- `src/App.tsx` (ny route)
- `src/pages/TenantDashboard.tsx` (detaljevisning, laest-markering, arkivering)

