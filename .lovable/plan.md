

## Operator Mail Item Detail Dialog

### Problem
Operatører kan ikke redigere en forsendelse eller slette et vedhæftet scan direkte fra dashboard-rækken. Lejer-tildeling kræver klik på lejer-kolonnen specifikt.

### Ændringer

#### 1. Ny komponent: `src/components/OperatorMailItemDialog.tsx`
En dialog der åbnes når operatøren klikker på en brev-række (undtagen lejer-kolonnen, modtaget-kolonnen og scan-kolonnen som allerede har egne klik-handlers).

Indhold:
- **Foto-preview** (hvis tilgængeligt) i venstre side
- **Redigerbare felter**: Forsendelsesnr., Afsender, Type (brev/pakke), Noter
- **Lejer-sektion**: Viser nuværende lejer med en "Skift lejer" knap der åbner den eksisterende `AssignTenantDialog`
- **Scan-sektion**: Hvis `scan_url` findes, vis et preview/link og en "Slet scan" knap med bekræftelsesdialog (sletter filen fra `mail-scans` bucket og sætter `scan_url`/`scanned_at` til null)
- **Gem-knap**: Gemmer ændringer til `mail_items`

#### 2. Opdater `src/pages/OperatorDashboard.tsx`
- Tilføj state for `editItem` (den klikkede MailItem)
- Gør `TableRow` klikbar med `onClick` der sætter `editItem` (undtagen celler der allerede har `stopPropagation`)
- Render `OperatorMailItemDialog` med `editItem`

### Teknisk flow
```text
Klik på række → Dialog åbnes med forsendelsens detaljer
  → Redigér felter + Gem
  → "Skift lejer" → Åbner AssignTenantDialog
  → "Slet scan" → Bekræftelse → Slet fil fra storage + nulstil scan_url
```

### Filer
- **Ny:** `src/components/OperatorMailItemDialog.tsx`
- **Ændret:** `src/pages/OperatorDashboard.tsx` — tilføj row click + render dialog

