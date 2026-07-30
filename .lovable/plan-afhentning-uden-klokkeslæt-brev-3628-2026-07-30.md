# Afhentning uden klokkeslæt (brev 3628)

## Hvad er der sket

Brev 3628 tilhører Intellyinvest Copenhagen ApS (tier: Standard) og er et brev. I databasen står:

- handling: `afhentning`
- afhentningstidspunkt: 30. juli kl. 00:00 (dansk tid) — altså kun en dato, intet klokkeslæt

Årsagen er en genvej i lejer-dashboardet: når en **Standard-lejer** vælger afhentning på et **brev**, springes booking-dialogen helt over. Systemet sætter automatisk næste torsdag kl. 00:00 og gemmer med det samme. Lejeren bliver aldrig bedt om et tidsrum.

I alle andre tilfælde (Lite, Plus, pakker, "anden afhentningsdag") åbnes dialogen, og "Bekræft" er deaktiveret indtil både dato og klokkeslæt er valgt — så der kan man ikke booke uden tidspunkt.

Så: ja, lejeren kan i dag bestille afhentning uden tidspunkt, men kun via denne ene genvej.

## Forslag til rettelse

1. Fjern genvejen for Standard-breve. I stedet åbnes booking-dialogen som for alle andre, men med datoen **låst til næste torsdag** (den gratis standard-afhentningsdag) — lejeren vælger kun klokkeslæt.
2. Dialogen viser tydeligt at datoen er fastlagt, og at valg af en anden dag kræver "Anden afhentningsdag" (som er gebyrbelagt).
3. "Bekræft" forbliver deaktiveret indtil klokkeslæt er valgt, så ingen booking kan gemmes uden tidspunkt. 2-timers bufferreglen gælder fortsat.
4. Eksisterende afhentninger uden klokkeslæt (herunder 3628) vises i operatørvisningen som "tidspunkt mangler", så operatøren kan følge op.

## Teknisk

- `src/pages/TenantDashboard.tsx`: fjern auto-mutation i `handleAction` for `afhentning` + Standard + brev; åbn i stedet `pickupDialogItem` med en forudsat dato (ny state, fx `lockedPickupDate`) og deaktiveret kalender.
- Visning: `formatPickupDisplay` udvides til at markere manglende klokkeslæt (00:00) i stedet for at vise midnat.
- Ingen databaseændringer nødvendige.
