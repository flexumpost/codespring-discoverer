## Opdater handlingsmuligheder i dropdown-menuen

### Problem

Dropdown-menuen viser "Opbevar" og "Destruer" fordi den aktuelle lejers tenant_type kun har disse handlinger konfigureret i databasen. Derudover mangler "Afhentning" som mulighed helt i systemet.

### Aendringer

**1. Database: Opdater tenant_types tabellen**

- Erstat `opbevar` med `afhentning` i alle tenant_types' `allowed_actions`
- De nye handlinger for breve bliver:
  - Lite: `[scan, send, afhentning, destruer]`
  - Standard: `[scan, send, afhentning, destruer]`
  - Plus: `[scan, send, afhentning, destruer]`
  - Fastlejer: `[scan, send, Lig på kontoret, destruer]`
  - Nabo: `Nabo kan ikke have handlinger, dette er blot til info for operatøren`
  - Retur til afsender: `Retur til afsender kan ikke have handlinger, dette er blot til info for operatøren`
- De nye handlinger for pakker bliver:
  - Lite: `[send, afhentning, destruer]`
  - Standard: `[send, afhentning, destruer]`
  - Plus: `[send, afhentning, destruer]`
  - Fastlejer: `[send, Lig på kontoret, destruer]`
  - Nabo: `Nabo kan ikke have handlinger, dette er blot til info for operatøren`
  - Retur til afsender: `Retur til afsender kan ikke have handlinger, dette er blot til info for operatøren`

**2. ACTION_LABELS i TenantDashboard.tsx**

- Fjern `opbevar: "Opbevar"`
- Tilfoej `afhentning: "Afhentning"`
- Omdoeb `videresend` label fra "Videresend" til "Send"

**3. Tilsvarende labels i OperatorDashboard.tsx**

- Opdater ACTION_LABELS der ogsaa, saa de matcher

### Teknisk detalje

SQL-migration:

```text
UPDATE tenant_types
SET allowed_actions = (opdaterede arrays uden 'opbevar', med 'afhentning')
WHERE ...
```

Kode-aendring i ACTION_LABELS:

```text
scan: "Åben og scan"
videresend: "Send"
afhentning: "Afhentning"
destruer: "Destruer"
```