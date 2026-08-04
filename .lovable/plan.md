# Velkomstmails blev aldrig sendt — årsag fundet

## Hvad der skete
Da du sendte velkomstmail til Info@2n9.dk og wondermaj@hotmail.com, blev der ikke sendt noget, og der blev heller ikke skrevet noget i email-loggen. Begge lejere står stadig med "velkomstmail sendt" fra hhv. 27. og 28. juli.

Årsagen: velkomstmail-funktionen slår lejeren op på et kontaktnavn-felt, som ikke længere findes i databasen (navnet blev tidligere delt op i fornavn og efternavn). Opslaget fejler derfor, funktionen får nul lejere tilbage og afslutter stille uden at sende, uden fejl og uden logning. Derfor så det ud som om "der ikke skete noget".

## Hvad der skal rettes
1. Ret opslaget i velkomstmail-funktionen til at bruge fornavn/efternavn i stedet for det gamle felt, og sammensæt modtagerens navn af de to (fald tilbage til firmanavnet, hvis navnet mangler).
2. Gør fejl synlige: hvis opslaget fejler, eller hvis en valgt lejer ikke findes, skal funktionen returnere en tydelig fejl/"skipped" pr. lejer, så du får en fejlbesked i stedet for tavshed.
3. Genudsend velkomstmail til de to lejere efter rettelsen, og bekræft i email-loggen at de står som "sent".

## Teknisk
- `supabase/functions/send-welcome-email/index.ts`: `select("id, company_name, contact_name, contact_email")` → `contact_first_name, contact_last_name`; `name` bygges som `[first, last].filter(Boolean).join(" ") || company_name`. Tilføj fejlhåndtering på tenants-opslaget (kast fejl) og tilføj `{ status: "skipped", error: "tenant not found" }` for id'er uden match.
- Deploy funktionen bagefter og send til de to lejere igen; verificér rækker i `email_send_log`.
