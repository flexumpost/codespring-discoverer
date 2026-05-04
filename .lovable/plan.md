## Situation

Dette projekt har i øjeblikket `flexum.dk` registreret som email-domæne, men det er aldrig blevet DNS-verificeret (status: `initiated`). Derfor fejler alle email-udsendelser.

`notify.flexum.dk` tilhører dit andet Lovable-projekt (flexum.dk-projektet) og må **ikke** ændres — det ville ødelægge emails dér.

Dit custom domæne her er `post.flexum.dk`, så vi opretter `mail.post.flexum.dk` som nyt afsenderdomæne. Det er et helt nyt subdomæne der ikke konflikter med noget eksisterende.

## Trin

1. **Behold `notify.flexum.dk` urørt** — det andet projekt bliver ved med at virke
2. **Fjern det uverificerede `flexum.dk` fra dette projekt** (det er kun "initiated", ingen aktiv brug)
3. **Opret `mail.post.flexum.dk`** som nyt email-domæne via setup-dialogen
4. **Du tilføjer DNS-records** hos din webhotel-udbyder (CNAME/TXT — du får de præcise værdier af dialogen)
5. **Vent på DNS-verifikation** (kan tage minutter til timer)
6. **Re-scaffold `auth-email-hook`** så auth-emails (login, password-reset, invites) bruger det nye domæne
7. **Deploy `auth-email-hook` og `process-email-queue`** så den nye konfiguration træder i kraft
8. **Verificér at email-køen drainer** — tjek `email_send_log` for nye `sent`-rækker

## Hvad du ser i din inbox bagefter

Lejere modtager mails fra `noreply@mail.post.flexum.dk` (eller lignende afsenderadresse), og links i mails peger på `https://post.flexum.dk` — samme domæne som de logger ind på. God genkendelighed og ingen konflikt med dit andet projekt.

## Tekniske detaljer

- **`notify.flexum.dk`** forbliver delegeret til Lovables nameservere (`ns3.lovable.cloud` / `ns4.lovable.cloud`) for det andet projekt — vi rører ikke NS-records hos din udbyder
- **`mail.post.flexum.dk`** sættes op i CNAME-mode (advanced/proxy mode) da din udbyder ikke understøtter NS-records — kun CNAME og TXT
- Eksisterende email-templates (welcome, new-shipment, shipment-dispatched, recovery, invite osv.) bibeholdes — kun afsenderdomænet ændres
- `process-email-queue` cron-job kører fortsat hvert 5. sekund og vil automatisk genoptage afsendelse når DNS er verificeret
- Eventuelle fejlede emails i kø vil retry automatisk (op til 5 gange, derefter DLQ) — ingen manuel handling nødvendig
- `email_send_state.retry_after_until` nulstilles om nødvendigt så køen ikke er låst i cooldown

## Hvad du skal gøre efter godkendelse

Når du godkender denne plan:
1. Jeg fjerner `flexum.dk` fra dette projekt (ikke `notify.flexum.dk`)
2. Du klikker på "Set up email domain"-knappen jeg viser, og indtaster `mail.post.flexum.dk`
3. Du får en liste af DNS-records — tilføj dem hos din udbyder
4. Skriv til mig når status skifter til **Active** (eller Awaiting DNS), så fortsætter jeg med scaffolding og deploy
