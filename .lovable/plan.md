

## Fix: Recovery-e-mails blokeret af rate limit der tæller forkert

### Problem
`request-password-reset` returnerer 200 men sender ingen e-mail. Årsagen er rate limit-tjekket (linje 39-44), som tæller **alle rækker** i `email_send_log` med `template_name='recovery'` den sidste time — inklusiv de 5 `failed`-rækker og 1 `dlq`-række fra det forrige fejlede forsøg (med `missing_unsubscribe`-fejlen). Det giver 7 rækker, som overstiger grænsen på 3, så funktionen returnerer stille success uden at sende.

Rate limit bør tælle **unikke forsøg** (distinkte `message_id`), ikke alle log-rækker.

### Ændringer

**`supabase/functions/request-password-reset/index.ts`**

1. Ændr rate limit-forespørgslen til at tælle distinkte `message_id` i stedet for alle rækker. Da Supabase JS-klienten ikke understøtter `COUNT(DISTINCT ...)`, skift til en RPC eller hent rækker og dedupliker i koden:
   - Hent `message_id` kolonnen (ikke bare `id`) for de seneste recovery-rækker
   - Dedupliker med `new Set()` og tjek størrelsen mod grænsen

2. Opdater grænsen fra 3 til 5 (brugerens valg)

```typescript
// Erstat linje 37-52 med:
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
const { data: recentRows } = await supabase
  .from('email_send_log')
  .select('message_id')
  .eq('recipient_email', cleanEmail)
  .eq('template_name', 'recovery')
  .gte('created_at', oneHourAgo)

const uniqueAttempts = new Set(
  (recentRows ?? []).map(r => r.message_id).filter(Boolean)
).size

if (uniqueAttempts >= 5) {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

3. Deploy `request-password-reset`

### Bemærkning
Neutral succesbesked bibeholdes ved rate limit (som aftalt) for at forhindre konto-enumeration.

