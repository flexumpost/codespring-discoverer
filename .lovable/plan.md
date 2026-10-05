# Tydeligere tekst for gratis standardscanning

En forsendelse på gratis standardscanning skal ikke længere vises som "Scanning bestilt Torsdag den 5. november" på operatørens oversigt. Teksten bliver i stedet "Gratis scanning Torsdag den 5. november". Så ligner den ikke en betalt scanning, der er bestilt til i dag.

- Gælder kun gratis standardscanning, for alle løsninger.
- En ekstra scanning, som lejeren selv har bestilt, viser fortsat "Scanning bestilt ...".
- Datoen og gebyret (0 kr.) er de samme som før.

## Teknisk
- `OperatorDashboard.tsx` linje 181: brug den nye nøgle `statusDisplay.freeScanOn` i stedet for `scanOrdered`, når handlingen er `standard_scan`.
- Tilføj nøglen i `da.json` ("Gratis scanning") og `en.json` ("Free scan").
