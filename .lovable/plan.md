
# Flyt post-tabel til Dashboard og fjern "Min post" menupunkt

## Hvad der aendres
- Menupunktet "Min post" fjernes fra sidebaren
- Ruten `/my-mail` fjernes
- Post-tabellen (fra TenantMailPage) flyttes ind paa Dashboard-siden under de 4 kort
- Arkiveret post skjules som standard (vises kun naar "Arkiveret"-kortet klikkes)
- Klik paa et kort filtrerer tabellen til kun at vise den paagaeldende status
- Klik paa det aktive kort igen nulstiller filteret (viser alt undtagen arkiveret)

## Aendringer

### 1. `src/pages/TenantDashboard.tsx`
- Importer alle noedvendige komponenter fra TenantMailPage (Table, Badge, Button, Dialog osv.)
- Tilfoej state for `activeFilter` (null = vis alt undtagen arkiveret, eller en specifik status)
- Goer hvert kort klikbart: klik saetter `activeFilter` til kortets status. Klik igen nulstiller
- Tilfoej visuelt aktivt-state paa det valgte kort (f.eks. ring/border)
- Flyt al post-tabel-logik fra TenantMailPage ind:
  - Hent tenant-info og allowed_actions
  - Hent mail_items filtreret paa `activeFilter` (eller alle undtagen arkiveret som standard)
  - Handlingsknapper for post med status "ny"
  - Foto-preview dialog
  - Bekraeftelsesdialog for destruering

### 2. `src/components/AppSidebar.tsx`
- Fjern "Min post" (`/my-mail`) fra `tenantItems`

### 3. `src/App.tsx`
- Fjern `/my-mail` ruten
- Fjern import af TenantMailPage

### 4. `src/pages/TenantMailPage.tsx`
- Filen kan slettes da al funktionalitet flyttes til TenantDashboard

### 5. Kort-klik logik
- Standard (intet kort valgt): vis post med status != "arkiveret"
- "Ny post" klikket: vis kun status = "ny"
- "Ulaeste breve" klikket: vis kun status = "ulaest"
- "Laeste breve" klikket: vis kun status = "laest"
- "Arkiveret" klikket: vis kun status = "arkiveret"
- Klik paa allerede aktivt kort: nulstil til standard
