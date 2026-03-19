

## Planlagt lejertypeskift

### Overblik
Operatører skal kunne planlægge et fremtidigt lejertypeskift (f.eks. Plus → Lite pr. 1. april). Systemet udfører skiftet automatisk på den valgte dato. Hvis den nye type er "Retur til afsender", deaktiveres lejeren (`is_active = false`), hvilket blokerer adgang for lejer og postmodtagere.

### 1. Ny database-tabel: `scheduled_type_changes`

```sql
CREATE TABLE public.scheduled_type_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  new_tenant_type_id uuid NOT NULL REFERENCES public.tenant_types(id),
  effective_date date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz,
  UNIQUE (tenant_id, effective_date)
);

ALTER TABLE public.scheduled_type_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators manage scheduled changes"
  ON public.scheduled_type_changes FOR ALL
  TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());
```

### 2. Edge function: `process-scheduled-type-changes`

Ny edge function der:
- Henter alle rækker hvor `effective_date <= today` og `executed_at IS NULL`
- For hver: opdaterer `tenants.tenant_type_id`
- Slår op om den nye type er "Retur til afsender" — hvis ja, sæt `is_active = false`
- Markerer rækken med `executed_at = now()`

### 3. Cron job (dagligt)

Kører edge-funktionen hver dag kl. 00:05 via `pg_cron` + `pg_net`.

### 4. UI: TenantDetailPage — planlagt skift

I "Virksomhed"-kortet (kolonne 1) tilføjes:
- En sektion under lejertype-dropdown med "Planlagt typeskift"
- Datovælger + type-dropdown + Gem-knap
- Viser eksisterende planlagte skift med mulighed for at annullere (slette)
- Hvis et skift er planlagt, vises en info-badge ved den nuværende lejertype

### 5. Deaktivering ved "Retur til afsender"

Når et typeskift (planlagt eller øjeblikkeligt) resulterer i "Retur til afsender":
- `is_active` sættes til `false` på tenants-tabellen
- Eksisterende queries filtrerer allerede på `is_active = true` (RegisterMailDialog, AssignTenantDialog, BulkUploadPage), så lejeren forsvinder automatisk fra aktive lister
- Lejer og postmodtagere mister adgang via `useTenants` som kun henter aktive tenants

Den øjeblikkelige ændring (direkte typeskift i UI) skal også håndtere dette — når operatør gemmer med "Retur til afsender" valgt, sættes `is_active = false` i samme mutation.

### Filer der oprettes/ændres

| Fil | Handling |
|-----|----------|
| Migration SQL | Ny tabel `scheduled_type_changes` |
| `supabase/functions/process-scheduled-type-changes/index.ts` | Ny edge function |
| `src/pages/TenantDetailPage.tsx` | UI til planlagt skift + deaktivering ved "Retur til afsender" |
| Cron SQL (insert via query tool) | Daglig kørsel af edge function |

### Teknisk detalje: Deaktivering

```text
Operatør vælger "Retur til afsender"
  ├─ Øjeblikkeligt: typeMutation sætter tenant_type_id + is_active=false
  └─ Planlagt: edge function gør det samme på effective_date
        
Lejeren mister adgang fordi:
  ├─ RegisterMailDialog/AssignTenant filtrerer .eq("is_active", true)
  └─ useTenants henter kun tenants linked til user_id → men login stadig muligt
      → Lejer ser tom dashboard (ingen aktiv tenant)
```

