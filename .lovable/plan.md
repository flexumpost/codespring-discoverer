

## Pakke-porto dropdown + OfficeRnD-synkronisering

### Oversigt
Tilføj porto-dropdown for pakker på forsendelsessiden. Gælder **alle** lejere (Lite, Standard, Plus). Kun Danmark-priser i denne iteration. Porto overføres som separat gebyr til OfficeRnD.

### Trin 1: Frontend — Porto-dropdown for pakker (ShippingPrepPage.tsx)

**Linje 608-609**: Udvid `showPorto`-logikken så den også viser dropdown for pakker (alle tiers):
```
const showPorto = (tab === "brev" && item.tenant_type_name !== "Plus") || tab === "pakke";
```

**Linje 633-645**: Tilføj pakke-porto-valgmuligheder når `tab === "pakke"`:
- DK 0-1 kg (48,00 kr.)
- DK 1-2 kg (57,60 kr.)
- DK 2-5 kg (77,60 kr.)
- DK 5-10 kg (101,60 kr.)
- DK 10-15 kg (133,60 kr.)
- DK 15-20 kg (141,60 kr.)

**Linje 279-293**: Gem `porto_option` for pakker i send-blokken (ligesom breve allerede gør).

### Trin 2: Backend — Udvid PORTO_MAP (sync-officernd-charge/index.ts)

Tilføj 6 nye entries med plan-navne matchende OfficeRnD-screenshot:
| Nøgle | Plan-navn | Beløb |
|-------|-----------|-------|
| `dk_pakke_0_1` | Pakke porto (0 - 1 kg.) á kr. 48,00 | 48.00 |
| `dk_pakke_1_2` | Pakke porto (1- 2 kg.) á kr. 57,60 | 57.60 |
| `dk_pakke_2_5` | Pakke porto (2 - 5 kg.) á kr. 77,60 | 77.60 |
| `dk_pakke_5_10` | Pakke porto (5 - 10 kg.) á kr. 101,60 | 101.60 |
| `dk_pakke_10_15` | Pakke porto (10 - 15 kg.) á kr. 133,60 | 133.60 |
| `dk_pakke_15_20` | Pakke porto (15 - 20 kg.) á kr. 141,60 | 141.60 |

**Linje 351**: Fjern `tierName !== "Plus"`-betingelsen for pakke-porto, så alle tiers synkroniseres.

### Berørte filer
| Fil | Ændring |
|-----|---------|
| `src/pages/ShippingPrepPage.tsx` | Porto-dropdown for pakker (alle tiers), gem porto_option ved send |
| `supabase/functions/sync-officernd-charge/index.ts` | 6 nye PORTO_MAP-entries, tillad Plus-tier for pakke-porto |

Ingen database-migration nødvendig — `porto_option`-kolonnen eksisterer allerede.

