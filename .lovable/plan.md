

## Undersøgelse: Manglende link på velkomst-email knappen

### Hvad jeg har fundet

Emailen til `matt@sonderandclay.com` blev sendt succesfuldt (bekræftet i email_send_log med status `sent`, template `welcome_shipment`, `is_new_tenant: true`).

Flowet var:
1. Ny lejer oprettet via RegisterMailDialog med `invite_silent` mode (bruger oprettes uden email)
2. `send-new-mail-email` kaldt med `is_new_tenant: true`
3. Funktionen finder `tenant.user_id` → forsøger `generateLink({ type: "magiclink" })` for at lave et password-sæt link
4. Resultatet bruges som `confirmationUrl` i WelcomeShipmentEmail-template

### Sandsynlig årsag

`generateLink` med `type: "magiclink"` returnerer et `action_link` i formatet:
```
https://hokiuavxyoymcenqlvly.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=...
```

Problemet er at denne URL indeholder `&`-tegn og potentielt andre specialtegn. Når den indsættes direkte i HTML via template literal inden i `dangerouslySetInnerHTML`, kan `&` i URL'en forvirre visse email-klienter, da `&` i HTML-attributter teknisk set bør være `&amp;`. Derudover kan et `"` eller `\n` i URL'en bryde `href="..."` attributten.

Et sekundært problem: der er INGEN console.log af den faktiske `confirmationUrl`, hvilket gør debugging umulig.

### Løsning

**1 fil**: `supabase/functions/send-new-mail-email/index.ts`

1. **HTML-escape URL'en** før den indsættes i template: Konverter `&` til `&amp;` i href-attributterne
2. **Tilføj logging** af den genererede `confirmationUrl` for fremtidig debugging
3. **Tilføj validering** — hvis `action_link` er tom eller ikke starter med `http`, brug fallback

**1 fil**: `supabase/functions/_shared/email-templates/welcome-shipment.tsx`

4. **Escape confirmationUrl** i template-filen, så `&` i URL'en konverteres til `&amp;` i href-attributterne

### Teknisk detalje

I `welcome-shipment.tsx`, ændre URL-indsættelsen:
```tsx
// Escape & to &amp; for valid HTML href attributes
const safeUrl = confirmationUrl.replace(/&/g, '&amp;')
```

Og bruge `safeUrl` i VML og `<a>` tag'ene.

I `send-new-mail-email/index.ts`, tilføje logging:
```typescript
console.log("confirmationUrl:", confirmationUrl);
if (!confirmationUrl || !confirmationUrl.startsWith("http")) {
  console.error("Invalid confirmationUrl, using fallback:", confirmationUrl);
  confirmationUrl = loginUrl;
}
```

Derefter redeployere edge function.

