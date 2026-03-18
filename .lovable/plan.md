

## Problem

Når en operatør sletter en scanning og forsøger at uploade en ny, fejler det med `new row violates row-level security policy` på storage. Årsagen er:

1. **Ingen DELETE-policy** på `mail-scans` bucket — så den fysiske fil bliver aldrig slettet fra storage (fejlen ignoreres i koden)
2. **Ingen UPDATE-policy** på `mail-scans` bucket — så `upsert: true` fejler, fordi filen stadig eksisterer og kræver en UPDATE

### Løsning

Tilføj manglende storage RLS-policies via en database migration:

```sql
-- Tillad operatører at slette filer i mail-scans
CREATE POLICY "Operators can delete scans"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mail-scans' AND is_operator());

-- Tillad operatører at opdatere filer i mail-scans (kræves ved upsert)
CREATE POLICY "Operators can update scans"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'mail-scans' AND is_operator());
```

### Ændrede filer

Kun én database migration — ingen kodeændringer nødvendige.

