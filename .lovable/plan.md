

## Tidsbetinget hilsen i header

### Ændring i `src/components/AppLayout.tsx`

Erstat den statiske "Hej" med en funktion der vælger hilsen baseret på klokkeslæt, og vis kun fornavn i stedet for fuldt navn:

- **06:00–09:59** → "Godmorgen"
- **10:00–11:59** → "God formiddag"  
- **12:00–13:59** → "God middag"
- **14:00–17:59** → "God eftermiddag"
- **18:00–05:59** → "God aften"

Brug kun `first_name` (fra user_metadata) i hilsenen. Fallback til email hvis intet fornavn findes.

Linje 10-21 ændres til:

```typescript
const firstName = user?.user_metadata?.first_name || user?.email || "";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return "Godmorgen";
  if (hour >= 10 && hour < 12) return "God formiddag";
  if (hour >= 12 && hour < 14) return "God middag";
  if (hour >= 14 && hour < 18) return "God eftermiddag";
  return "God aften";
};

// I JSX:
<span>…{getGreeting()} {firstName}</span>
```

Én fil, ingen database-ændringer.

