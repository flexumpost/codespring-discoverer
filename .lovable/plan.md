

## Tilføj "Linket er aktivt i X timer" til tidsbegrænsede e-mails

### Oversigt
Tilføj en tekst der informerer modtageren om hvor længe linket er gyldigt i de e-mails der indeholder tidsbegrænsede links.

### Berørte e-mails og udløbstider
- **Invite** (`invite.tsx`) — 24 timer (invite token)
- **Recovery** (`recovery.tsx`) — 1 time (recovery token)
- **Magic Link** (`magic-link.tsx`) — 1 time (magic link token)
- **Welcome Shipment** (`welcome-shipment.tsx`) — 24 timer (invite token, brugt ved ny lejer)

### Ændringer

**1. `supabase/functions/_shared/email-templates/invite.tsx`**
- Tilføj efter knappen, før footer-teksten:
  `<Text style={hint}>Linket er aktivt i 24 timer.</Text>`

**2. `supabase/functions/_shared/email-templates/recovery.tsx`**
- Tilføj efter knappen, før footer-teksten:
  `<Text style={hint}>Linket er aktivt i 1 time.</Text>`

**3. `supabase/functions/_shared/email-templates/magic-link.tsx`**
- Erstat den eksisterende vage tekst "Linket udløber kort efter" med en præcis tekst.
- Tilføj efter knappen: `<Text style={hint}>Linket er aktivt i 1 time.</Text>`

**4. `supabase/functions/_shared/email-templates/welcome-shipment.tsx`**
- Tilføj efter knappen, før footer-teksten:
  `<Text style={hint}>Linket er aktivt i 24 timer.</Text>`

### Styling
Alle fire filer får en `hint`-stil:
```typescript
const hint = { fontSize: '12px', color: '#999999', textAlign: 'center', margin: '0 0 24px' }
```

