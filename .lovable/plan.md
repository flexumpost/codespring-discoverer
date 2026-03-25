

## Udvid OfficeRnD-trigger til at dække alle gebyr-udløsende handlinger

### Problemet
Triggeren fyrer kun på `status = 'arkiveret'`, men gebyrer opstår ved:
- **Sendt**: status → `sendt_med_dao` / `sendt_med_postnord`
- **Afhentet**: status → `arkiveret` med `chosen_action = 'afhentet'`
- **Scannet**: `scan_url` sættes (status → `ulaest`)

### Løsning
Én ny migration der erstatter trigger-funktionen med bredere betingelser. Edge-funktionen beregner allerede gebyret og skipper ved 0 kr., så triggeren behøver kun at fyre på de rigtige tidspunkter.

**Trigger fyrer når:**

| Hændelse | Betingelse |
|----------|-----------|
| Forsendelse | `NEW.status IN ('sendt_med_dao', 'sendt_med_postnord')` og gammel status var anderledes |
| Afhentning | `NEW.status = 'arkiveret'` og `NEW.chosen_action = 'afhentet'` |
| Scanning | `NEW.scan_url IS NOT NULL` og `OLD.scan_url IS NULL` (scan uploadet) |

**Trigger fyrer IKKE ved:**
- Destruktion (`chosen_action = 'destruer'`) — altid 0 kr.
- Bruger-arkivering uden afhentning
- `sendt_retur` — retur til afsender, intet gebyr

### Teknisk detalje
```sql
-- Pseudologik i trigger-funktionen:
DECLARE _should_sync boolean := false;
BEGIN
  -- Sendt
  IF NEW.status IN ('sendt_med_dao','sendt_med_postnord') 
     AND OLD.status IS DISTINCT FROM NEW.status 
  THEN _should_sync := true; END IF;

  -- Afhentet
  IF NEW.status = 'arkiveret' AND OLD.status <> 'arkiveret'
     AND NEW.chosen_action = 'afhentet'
  THEN _should_sync := true; END IF;

  -- Scannet
  IF NEW.scan_url IS NOT NULL AND OLD.scan_url IS NULL
  THEN _should_sync := true; END IF;

  IF NOT _should_sync THEN RETURN NEW; END IF;
  -- ... check enabled, get key, call edge function
END;
```

### Ændringer
- **1 ny migration**: Erstatter `notify_officernd_on_archive()` med udvidet logik
- Ingen ændringer i edge function (den håndterer allerede alle gebyrberegninger og 0 kr.-skip)

