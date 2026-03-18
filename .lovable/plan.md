

## Plan: Tilføj søgefelt til Email Log

### Ændringer

**1. Edge function `supabase/functions/get-email-log/index.ts`**
- Læs ny query parameter `search` fra URL
- Hvis `search` er sat, tilføj `.or(`template_name.ilike.%${search}%,recipient_email.ilike.%${search}%`)` til både logs-query og count-query

**2. Frontend `src/components/EmailLogTab.tsx`**
- Tilføj `search` state med debounce (300ms) så der ikke spammes requests
- Nulstil `page` til 0 når søgeteksten ændres
- Indsæt et `Input`-felt med søgeikon over tabellen med placeholder "Søg på template eller modtager..."
- Send `search` som query param til edge function og inkluder i `queryKey`

### Filer der ændres
- `supabase/functions/get-email-log/index.ts`
- `src/components/EmailLogTab.tsx`

