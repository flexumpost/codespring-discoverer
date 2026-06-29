## Mål

Flyt automatiserings-indstillinger ud i sit eget menupunkt så indstillingssiden bliver mere overskuelig, og fjern duplikerede / unødvendige valg af "Standard handling for breve".

## Ændringer

### 1. Nyt menupunkt i lejer-sidebar
- `src/components/AppSidebar.tsx`: Tilføj `{ title: t("nav.automation"), url: "/automation", icon: Zap }` (eller `Sliders`) i `tenantItems` — placeret over `Settings`.
- Tilføj oversættelse `nav.automation` = "Automatisering" / "Automation" i `da.json` og `en.json`.

### 2. Ny side `/automation`
- Opret `src/pages/AutomationPage.tsx`:
  - Bruger `AppLayout` + `TenantSelector` (samme mønster som `SettingsPage`).
  - Viser den eksisterende `<AutomationCard>` for den valgte tenant.
  - Header: "Automatisering" + kort intro-tekst.
- Registrer ruten i `src/App.tsx` under tenant-routes (beskyttet på samme måde som `/settings`).

### 3. Fjern Automatisering-kortet fra Settings
- `src/pages/SettingsPage.tsx`: Fjern `<AutomationCard>`-blokken i venstre kolonne (importen ryger med).

### 4. Fjern duplikeret "Standard handling for breve" i pris-kortet
- `src/components/PricingOverview.tsx` (`MailPricingCard`): Fjern dropdown + Gem-knap for `default_mail_action` (det vises i image 1). Resten af pris-/betingelses-indholdet bevares uændret.
- Behold mutation-koden kun hvis den bruges andre steder; ellers ryd op.

### 5. Fjern første-login prompt om standard handling for breve
- `src/components/DefaultActionSetup.tsx` + det sted komponenten mountes (tjekkes via `rg "DefaultActionSetup"`): Fjern komponenten og dens kald, så nye lejere ikke bliver spurgt. Default i DB forbliver `send` (Forsendelse) — sættes eksplicit ved tenant-oprettelse hvis ikke allerede.

### 6. AutomationCard uændret indhold
- Radio-valg for breve (Forsendelse / Scanning / Afhentning) **bevares** på den nye side.
- Pakke-sektion forbliver låst til "Forsendelse (kan ikke ændres for pakker)".

## Ikke-mål
- Ingen DB-migrationer.
- Ingen ændringer for operator-rollen.
- Ingen ændring af eksisterende logik bag `default_mail_action`.
