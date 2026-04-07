

## Fix: /set-password hænger ved udløbne links i stedet for at vise fejlbesked

### Årsag

1. **Ugyldiggjort token**: Der blev sendt to welcome_shipment-mails til mail@rasmusholm.io (kl. 08:24 og 12:04). Den anden magiclink-generering ugyldiggjorde den første. Brugeren klikkede sandsynligvis på det gamle link.

2. **Manglende fejlhåndtering i SetPasswordPage**: Når Supabase /verify modtager et udløbet token, redirecter det til `/set-password#error=access_denied&error_description=...` — uden `access_token`. Koden tjekker kun for `access_token` i hash'en. Når den ikke finder det, falder den ned i else-branchen der venter på auth-events der aldrig kommer → evig "Indlæser...".

### Løsning

**Fil**: `src/pages/SetPasswordPage.tsx`

I useEffect'en, tilføj et tjek for `error` parameteren i hash'en INDEN tjekket for `access_token`:

```typescript
useEffect(() => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  
  // Check for error from expired/invalid links FIRST
  const error = params.get("error") || params.get("error_code");
  if (error) {
    setLinkExpired(true);
    setLoading(false); // stop showing "Indlæser..."
    window.history.replaceState(null, "", window.location.pathname);
    return;
  }

  const accessToken = params.get("access_token");
  // ... rest of existing logic
```

### Løsning for brugeren NU

Brugeren bør klikke på linket i den **seneste** e-mail (kl. 12:04). Hvis det link også er udløbet, skal der sendes en ny invitation.

### Ændringer

- Én fil: `src/pages/SetPasswordPage.tsx` — tilføj fejlparametercheck i useEffect
- Ingen backend-ændringer

