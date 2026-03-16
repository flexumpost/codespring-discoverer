## Problem

1. **Afsendernavn**: `SITE_NAME = "codespring-discoverer"` bruges som afsendernavn (`codespring-discoverer <noreply@notify.flexum.dk>`). Skal være "Flexum Coworking".
2. **Emnelinjer**: Signup, magiclink, recovery og email_change har engelske emnelinjer.
3. **siteUrl**: Peger på `codespring-discoverer.lovable.app` i sample data — bør pege på `flexum.dk` i produktion (allerede korrekt i webhook-handler linje ~230 hvor `siteUrl` sættes til `https://${ROOT_DOMAIN}`).

## Ændringer


| Fil                                           | Ændring                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `supabase/functions/auth-email-hook/index.ts` | Ændr `SITE_NAME` fra `"codespring-discoverer"` til `"Flexum Coworking"`. Oversæt emnelinjer til dansk. |


Konkrete værdier:

```
SITE_NAME = "Flexum"

EMAIL_SUBJECTS = {
  signup: 'Bekræft din e-mail',
  invite: 'Velkommen til Flexum',
  magiclink: 'Dit login-link',
  recovery: 'Nulstil din adgangskode',
  email_change: 'Bekræft din nye e-mail',
  reauthentication: 'Din bekræftelseskode',
}
```

Herefter redeploy af `auth-email-hook`.