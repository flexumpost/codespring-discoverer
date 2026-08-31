# Manglende klokkeslæt ved gratis afhentning

## Hvad er galt

Forsendelse 3746 (Altbyg.dk, Lite, brev) har faktisk et korrekt gemt afhentningstidspunkt i databasen: **3. september kl. 16:00**. Handlingen er gemt som `gratis_afhentning`.

Problemet er kun i visningen: både lejer-dashboardet og operatør-dashboardet behandler `gratis_afhentning` som en fast "første torsdag i måneden"-dato og ignorerer det bookede `pickup_date` helt. Derfor står der kun "Gratis afhentning Torsdag den 3. september" uden klokkeslæt — mens den betalte `afhentning` viser dato + tidsrum.

Det er en rest fra før ændringen, hvor Lite-lejere også skal vælge tidsrum.

## Rettelse

1. Lejer-visning: når handlingen er `gratis_afhentning` og der findes et `pickup_date`, vises samme tekst som ved betalt afhentning — "Torsdag den 3. september kl. 16:00-17:00". Kun hvis der ikke er bookede tidspunkt, falder den tilbage til den faste dato.
2. Operatør-visning: samme logik, så operatøren ser klokkeslættet på afhentningslisten.
3. Operatørens "Afhentning i dag"-tæller bruger det faktiske `pickup_date` for gratis afhentninger i stedet for den beregnede torsdag, så tallet passer med de reelle bookinger.
4. Manglende klokkeslæt (gamle bookinger gemt kl. 00:00) vises fortsat som "tidspunkt mangler".

## Teknisk

- `src/pages/TenantDashboard.tsx`: i `getStatusDisplay` samles `afhentning` og `gratis_afhentning` i samme gren via `formatPickupDisplay(item.pickup_date, item.notes, t)` med fallback til `getFirstThursdayOfMonth()`.
- `src/pages/OperatorDashboard.tsx`: samme i statusteksten (linje ~193) og i `countFilter` for afhentningskortet (linje ~438).
- Ingen databaseændringer; ingen ændring af booking-flowet.
