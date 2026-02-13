

## Real-time opdatering af operatoer-dashboardet

### Problem
Operatoer-dashboardet henter kun data ved foerste indlaesning (useEffect med tomt dependency-array). Naar en lejer aendrer handling, ser operatoeren det foerst efter en manuel sideopdatering.

### Loesning

To aendringer:

**1. Aktiver Realtime for mail_items tabellen (migration)**

```text
ALTER PUBLICATION supabase_realtime ADD TABLE public.mail_items;
```

Realtime er allerede aktiveret for `notifications`, men ikke for `mail_items`.

**2. Tilfoej Realtime-subscription i OperatorDashboard.tsx**

I den eksisterende `useEffect`, tilfoej en Supabase Realtime-kanal der lytter paa `postgres_changes` for `mail_items`-tabellen. Ved enhver aendring (INSERT, UPDATE, DELETE) genindlaeses hele listen via `refreshMail()` for at sikre korrekte join-data (tenants.company_name).

```text
useEffect(() => {
  // Eksisterende fetch
  refreshMail();

  // Realtime subscription
  const channel = supabase
    .channel('operator-mail-updates')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mail_items' },
      () => { refreshMail(); }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

### Resultat
- Naar en lejer vaelger en handling (scan, send, afhentning, destruer), opdateres operatoer-dashboardet automatisk inden for faa sekunder
- Status-kort (taeellere) opdateres ogsaa, da de beregnes fra `mailItems` state
- Ingen nye kolonner eller tabeller

