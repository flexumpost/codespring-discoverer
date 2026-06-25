## Problem

`email_send_log` viser at invite-mailen til `frederik_frederik@hotmail.com` kl. 08:04 i dag fejlede med `"Emails disabled for this project"`. Project Emails er deaktiveret på workspace-niveau — det er årsagen til at hverken invite eller recovery sendes. DNS er korrekt: NS-records (`ns7/ns8.lovable.cloud`) og TXT-verifikationen er live; quic.cloud-fejlen "Same record already exists" betyder bare at recorden allerede er der.

## Trin

1. **Genaktivér Lovable Emails** for projektet (`toggle_project_emails` → enabled).
2. **Verificér status** — bekræft at både domænestatus og emails-toggle er aktive.
3. **Gensend invite** til `frederik_frederik@hotmail.com` via den eksisterende admin/genudsend-flow (samme som tidligere manuelle resend).
4. **Tjek `email_send_log`** efter ~30 sek for at bekræfte at status går fra `pending` → `sent`.

## Ingen kodeændringer

Dette er rent en konfigurations-/driftshandling — ingen ændringer i `src/` eller `supabase/functions/`. DNS forbliver uændret.

## Hvis Lovable Emails forbliver inaktive

Hvis toggle ikke kan slås til (f.eks. fordi domænestatus stadig hænger i `verifying`), peger jeg i Cloud → Emails → Manage Domains → **Verify Domain** for at tvinge en re-check, og hvis det fejler: slet og gentilføj domænet.
