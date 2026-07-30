# Hvorfor 17 på dashboardet, men en kæmpe gruppe under "Send breve og pakker"?

De to sider bruger ikke samme regler.

Operatør-dashboardet:
- Skjuler helt lejere af typen "Retur til afsender" og "Nabo".
- Tæller kun poster, hvor operatøren aktivt mangler at handle, og hvor afsendelsesdagen er i dag.
- Resultat: 17 (16 breve + 1 pakke).

"Send breve og pakker":
- Skjuler ikke retur-/nabo-lejere.
- Grupperer efter leveringsadresse. Retur-lejere har ingen adresse, så alle 83 ubehandlede retur-breve lander i én og samme "tom adresse"-gruppe sammen med et par andre adresseløse lejere.
- Derfor ser det ud som 5 grupper, hvor den ene indeholder næsten 100 breve.

Tal i databasen lige nu (ubehandlede breve med forsendelse i dag): Plus 6, Standard 10, Retur til afsender 83.

## Ændringer

1. Skjul "Retur til afsender" og "Nabo" på siden "Send breve og pakker", præcis som på dashboardet. Så viser listen kun de 16 breve + 1 pakke, der reelt skal sendes.
2. Ryd op i de eksisterende 84 ubehandlede poster på retur-/nabo-lejere: de sættes til status "sendt retur", så de forsvinder fra alle arbejdslister, men bevares i historikken.
3. Fremover: når der registreres post (både enkelt-registrering og bulk upload) på en "Retur til afsender"-lejer, sættes posten automatisk til "sendt retur" uden valgt handling, så den aldrig havner i arbejdslisterne. Operatøren får en tydelig markering i dialogen om, at posten sendes retur til afsender.

Lejere af typen "Nabo" berøres kun af punkt 1 og 2 (de skjules i afsendelseslisten og ryddes op) — registrering for dem ændres ikke.

## Teknisk

- `src/pages/ShippingPrepPage.tsx`: hent `tenant_types.name` (allerede med) og filtrér `["Retur til afsender", "Nabo"]` fra i `items`-mappingen, samme `hiddenTypes`-liste som `OperatorDashboard.refreshMail`.
- Data-opdatering (insert-tool): `UPDATE public.mail_items SET status = 'sendt_retur' WHERE status IN ('ny','afventer_handling','ulaest','laest') AND tenant_id IN (SELECT t.id FROM tenants t JOIN tenant_types tt ON tt.id = t.tenant_type_id WHERE tt.name IN ('Retur til afsender','Nabo'))`.
- Automatisk retur ved registrering: migration der udvider triggerfunktionen `apply_tenant_default_action()` — hvis lejerens type er "Retur til afsender", sæt `status = 'sendt_retur'` og `chosen_action = NULL` i stedet for standardhandlingen. Det dækker både `RegisterMailDialog` og `BulkUploadPage`, da begge indsætter direkte i `mail_items`.
- `src/components/RegisterMailDialog.tsx` og `src/pages/BulkUploadPage.tsx`: vis et rødt "Retur til afsender – sendes retur"-hint når den valgte lejer har den type, så operatøren ved det med det samme.
