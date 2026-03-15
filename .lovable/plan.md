
## Status lige nu (hvad der faktisk sker)

1. **Velkomst-e-mail funktionen kører og køer beskeder korrekt**
   - `send-welcome-email`:
     - Validerer at du er logget ind som **operator**
     - Slår `email_templates.slug = 'welcome'` op
     - Henter de valgte lejere
     - Rendrer HTML via `WelcomeEmail` React-skabelonen
     - Lægger en besked i køen `transactional_emails` via `enqueue_email`
     - Opretter en række i `email_send_log` med `status = 'pending'`
     - Sætter `tenants.welcome_email_sent_at` til nu
   - Det ser vi i `network-requests` (funktion svarer med `"status": "queued"`) og i databasen (`email_send_log` har flere `pending`-rækker for `welcome`).

2. **Kø-processoren prøver at sende – men bliver blokeret af rate limit**
   - `process-email-queue`:
     - Henter batches fra `auth_emails` og derefter `transactional_emails`
     - Bygger payload dynamisk og kalder `sendLovableEmail(...)` med:
       - `to`, `from`, `sender_domain`, `subject`, `html`, `text`, `purpose`, `label`, `message_id`
       - kun `run_id` m.fl. når de faktisk findes (auth-e-mails)
   - Edge funktions-log udsnit viser gentagne fejl:
     - `Email API error: 429 {"type":"rate_limited","message":"High demand! Please try again in a moment.","props":{"key":"rate_limit:workspace:email_send:..."} }`
     - Dvs. **hele workspacen** er midlertidigt blokeret hos e-mail-tjenesten pga. mange forsøg.
   - `email_send_state` viser:
     - `retry_after_until = 2026-03-15 12:17:27.639+00`
     - Dvs. kø-processoren har sat en “cooldown” og stopper med at sende indtil dette tidspunkt.

3. **Derfor ser du ingen e-mail i indbakken**
   - E-mailen er:
     - Rendret,
     - Lagt i kø,
     - Registreret som `pending` i `email_send_log`,
   - … men den **får ikke lov til at forlade** systemet, fordi backendens e-mail-udbyder svarer med 429 rate limit.
   - Det er årsagen til “stadig ingen e-mail”, selvom UI viser “queued” og `welcome_email_sent_at` er sat.

---

## Mål

1. **Sikre at selve e-mail-pipelinen er helt korrekt og robust**  
   (den del er reelt på plads nu: kø → dispatcher → e-mail-API → retries & rate-limit-backoff).
2. **Gøre systemet ærligt og gennemsigtigt**:
   - Ikke markere en velkomst-e-mail som “sendt” før den faktisk er leveret.
   - Give dig overblik over, om e-mail-systemet lige nu er rate-limited eller OK.
3. **Minimere risikoen for at ramme rate limits igen** ved at lade køen styre tempoet og undgå gentagne manuelle forsøg.

---

## Plan: Ryd op og færdiggør e-mail-forsendelsen “fra bunden”

### 1. Ryd semantikken op omkring `welcome_email_sent_at`

**Problem nu**
- `send-welcome-email` sætter `tenants.welcome_email_sent_at = now()` **allerede når beskeden er lagt i kø** – dvs. før vi ved om den er leveret.
- Det er misvisende, især når e-mail-API’et er rate-limited eller fejler.

**Plan**
1. I `send-welcome-email`:
   - **Fjern** opdateringen af `welcome_email_sent_at`:
     - Drop:
       ```ts
       await supabaseAdmin
         .from("tenants")
         .update({ welcome_email_sent_at: new Date().toISOString() })
         .eq("id", tenant.id);
       ```
   - Behold:
     - Enqueue i `transactional_emails`
     - Insert i `email_send_log` med `status: "pending"`

2. Lad `welcome_email_sent_at` fremover betyde:  
   **“Tidspunkt hvor velkomst-e-mail reelt er sendt”** – ikke bare kølagt.

3. Opdater eventuelle UI-tekster (fx i /tenants) så de tolker feltet som “sendt” og ikke “bare kølagt”.

---

### 2. Knyt e-mail-log til den konkrete lejer og opdater når den ER sendt

For at kunne sætte `welcome_email_sent_at` på det rigtige tidspunkt skal kø-processoren vide, **hvilken lejer** en given e-mail tilhører.

**Plan**
1. Udvid payload i `send-welcome-email` med `tenant_id`:
   ```ts
   payload: {
     message_id: messageId,
     tenant_id: tenant.id,   // NYT
     to: tenant.contact_email,
     from: "Flexum <noreply@notify.flexum.dk>",
     sender_domain: "notify.flexum.dk",
     subject,
     html,
     text: ...,
     purpose: "transactional",
     label: "welcome",
     queued_at: new Date().toISOString(),
   }
   ```

2. I `process-email-queue`:
   - Når en e-mail er sendt uden fejl (lige efter `status: 'sent'` er indsat i `email_send_log`):
     - Tjek om:
       - `queue === 'transactional_emails'`
       - `payload.label === 'welcome'`
       - `payload.tenant_id` findes.
     - Hvis ja:
       ```ts
       await supabase
         .from('tenants')
         .update({ welcome_email_sent_at: new Date().toISOString() })
         .eq('id', payload.tenant_id);
       ```
   - Så bliver `welcome_email_sent_at` **kun** sat når kø-processoren faktisk har leveret beskeden via e-mail-API’et.

3. (Valgfrit men pænt) udvid `email_send_log.metadata` med fx `{ tenant_id }` for lettere debugging:
   - Når der indskrives `pending` og `sent`-rækker for `welcome`, kan metadata indeholde `tenant_id`.

---

### 3. Håndtering af rate limit – bekræft at backoff-logikken er aktiv

Her er vi næsten i mål allerede, men det er vigtigt at have det på plads:

1. **Allerede implementeret i `process-email-queue`**:
   - Ved 429:
     - `isRateLimited(error)` returnerer `true`.
     - Der skrives en `rate_limited`-række i `email_send_log` (for den enkelte besked).
     - `email_send_state.retry_after_until` sættes til nu + `retryAfterSeconds` (eller 60 sek).
     - Funktion returnerer straks, så de resterende beskeder bliver liggende i køen.

2. Ved næste cron-kald:
   - Funktion læser `email_send_state`.
   - Hvis `retry_after_until > now()`, returnerer den hurtigt med `{ skipped: true, reason: 'rate_limited' }` uden at kalde e-mail-API’et igen.
   - Først **efter** dette tidspunkt vil den næste batch forsøge at sende igen.

3. **Plan herfra**
   - Ingen større kodeændringer, blot:
     - Sikre at den nuværende version af `process-email-queue` (med dynamisk payload og rate-limit-backoff) er deployet, og at vi **ikke** går tilbage til tidligere versioner.
     - Holde øje med `email_send_state.retry_after_until` og de første `sent`-rækker i `email_send_log` for at bekræfte at 429-perioden er overstået.

---

### 4. Gør det synligt i UI hvad der sker (så du ikke bliver snydt igen)

For at undgå “Stadig ingen e-mail!!!” uden forklaring, giver det mening at udbygge UI lidt:

1. **Statuskolonne for velkomst-e-mail på /tenants**
   - For hver lejer:
     - Slå seneste `email_send_log`-række op for `template_name = 'welcome'` og modtagerens e-mail.
     - Kombinér med `welcome_email_sent_at`.
   - Vis fx:
     - **“Ikke sendt”** – ingen log og `welcome_email_sent_at` er `null`.
     - **“I kø”** – seneste status er `pending`, `welcome_email_sent_at` er `null`.
     - **“Sendt”** – seneste status er `sent`, `welcome_email_sent_at` sat.
     - **“Fejl / rate limited”** – seneste status `failed`, `dlq` eller `rate_limited` (vis kort fejltekst on hover eller i tooltip).

2. **Lille “E-mail health” indikator i operator-indstillinger**
   - Læs én række fra `email_send_state`:
     - Hvis `retry_after_until` er i fremtiden → vis “E-mails midlertidigt begrænset indtil HH:MM”.
     - Ellers → vis “E-mails OK”.
   - Så ved du med det samme, om det giver mening at teste igen.

---

### 5. Hvad du konkret kan forvente

- **På kort sigt** (uden yderligere kodeændringer):
  - De velkomst-e-mails der er `pending` vil blive forsøgt igen automatisk, når rate-limit-cooldownen udløber.
  - Der kan fortsat gå lidt tid, før vores backend-udbyder ophæver begrænsningen helt, da den er på workspace-niveau.

- **Efter ovenstående ændringer er implementeret**:
  - Lejere får velkomst-e-mails, så snart e-mail-udbyderen accepterer dem.
  - `welcome_email_sent_at` afspejler faktiske sendte e-mails – ikke bare kølagte.
  - Du får tydelig feedback i UI, når e-mail-systemet er rate-limited, i stedet for at alt “ser fint ud” uden at der kommer noget frem i indbakken.

---

### Tekniske detaljer (til implementering)

1. **send-welcome-email/index.ts**
   - Fjern opdatering af `welcome_email_sent_at`.
   - Udvid payload til `enqueue_email` med `tenant_id`.
   - Behold logging af `pending` i `email_send_log`.

2. **process-email-queue/index.ts**
   - Efter succesfuldt `sendLovableEmail(...)` + `status: 'sent'` i `email_send_log`:
     - Hvis `queue === 'transactional_emails'` og `payload.label === 'welcome'` og `payload.tenant_id`:
       - Opdater `tenants.welcome_email_sent_at`.
   - Sørg for at `isRateLimited(...)` og `getRetryAfterSeconds(...)` bliver **stående** som nu.
   - Evt. tilføj et ekstra log-statement når funktionen skipper pga. `retry_after_until`, så det er tydeligt i edge-funktions-loggen.

3. **Database / RLS**
   - Ingen nye tabeller nødvendige.
   - Opdateringer til `tenants` og `email_send_log` sker allerede med service-role i Edge Functions, så RLS er OK.

---

<lov-actions>
<lov-suggestion message="Når ændringerne er implementeret, så send én velkomst-e-mail til en testlejer fra /tenants og tjek både indbakken og email_send_log for at bekræfte, at hele flowet virker end-to-end.">Test velkomst-e-mail flowet end-to-end</lov-suggestion>
<lov-suggestion message="Opdater UI på /tenants så der vises en statuskolonne for velkomst-e-mails (ikke sendt, i kø, sendt, fejl) baseret på kombinationen af welcome_email_sent_at og email_send_log.">Vis tydelig status for velkomst-e-mails i UI</lov-suggestion>
<lov-suggestion message="Tilføj en lille 'E-mail status' boks i operator-indstillinger, der læser email_send_state og viser om e-mails lige nu er rate-limited eller OK og hvornår næste forsøg sker.">Tilføj en synlig 'E-mail health' indikator</lov-suggestion>
<lov-suggestion message="Implementér en simpel 'send testmail til mig selv'-funktion til operatører, der bruger den samme kø-baserede infrastruktur, så du kan teste uden at påvirke lejere.">Tilføj en testmail-funktion til operatører</lov-suggestion>
<lov-suggestion message="Udbyg en lille log-/debug-side i appen, hvor du kan se de seneste rækker fra email_send_log (template, status, fejltekst) filtreret på velkomst-e-mails.">Lav en simpel visning af email_send_log i appen</lov-suggestion>
</lov-actions>
