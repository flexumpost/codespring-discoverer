# Fuld lejervisning for operatøren ("Vis som lejer")

## Hvad er problemet

- Lejeren har menuen: Oversigt, Forsendelsesadresse, Forsendelsesadresser (kun samarbejdspartnere), Automatisering og Indstillinger.
- "Vis som lejer" viser i dag kun lejerens forside (Oversigt) inde i operatørens egen menu. Du kan derfor ikke se Automatisering eller de andre lejersider og kan ikke vejlede lejeren.
- Automatiseringen viser også "Afhentning" som valg, men systemet afviser det, når lejeren trykker Gem. Lejeren får så en fejl.

## Hvad der bygges

1. **Lejerens menu i "Vis som lejer"**
   - Øverst i lejervisningen kommer en menulinje, der svarer til lejerens egen menu: Oversigt, Forsendelsesadresse, Forsendelsesadresser (kun hvis lejeren er samarbejdspartner), Automatisering og Indstillinger. Navne og rækkefølge er de samme som hos lejeren.
   - Hvert punkt viser den side, lejeren ser, med lejerens egne data.
   - Et tydeligt bånd viser "Du ser siden som [firmanavn]", og der er en knap tilbage til lejerens side.
   - Du kan rette ting her, fx standardhandlingen. Det svarer til at rette det på lejerens side under Lejere.

2. **Automatisering rettes**
   - "Afhentning" fjernes som standardvalg for breve. Kun Forsendelse og Scanning kan vælges.
   - En kort tekst forklarer, at afhentning altid kan bookes på det enkelte brev eller den enkelte pakke.

## Tekniske detaljer

- `TenantViewPage.tsx`: tilføj faner/undermenu og under-ruter `/tenants/:id/dashboard`, `/tenants/:id/view/shipping-address`, `/view/partner-addresses`, `/view/automation` og `/view/settings`, eller fane-state i siden. Hver fane får `overrideTenantId={id}`.
- Lejersiderne (`ShippingAddressPage`, `PartnerAddressesPage`, `AutomationPage` og lejerdelen af `SettingsPage`) får en valgfri `overrideTenantId`-prop. Med den skjules `TenantSelector`/`AppLayout`, og data hentes for den angivne lejer. Operatøren har allerede læse- og skriveadgang via RLS.
- Partnerfanen vises kun, når `tenant.is_partner` er sat. Den grupperer firmaer via ejerens bruger, ligesom i `PartnerGroupAddresses`.
- `AutomationCard.tsx`: fjern `afhentning` fra `OPTIONS` og tilføj ny i18n-nøgle `automation.pickupNote` (da/en). Nye nøgler til båndet, `tenantView.viewingAs`.

## Verifikation

- Playwright som operatør: åbn Radner → "Vis som lejer" og klik alle menupunkter igennem, inkl. Automatisering og Forsendelsesadresser. Tag skærmbilleder.
- Gem en standardhandling uden fejl.
