# Rundvisning for lejere

## Hvad der bygges
- En trin-for-trin rundvisning. Hvert trin fremhæver én del af skærmen med en lille boks med forklaring og knapperne "Næste", "Tilbage" og "Afslut".
- Rundvisningen starter automatisk første gang en ny lejer logger ind, efter at adressen er bekræftet. Den kommer ikke igen af sig selv, når den er afsluttet eller sprunget over.
- Nyt menupunkt **"Vis funktioner"** i lejerens menu, nederst. Det starter rundvisningen igen, når lejeren vil.
- Tekster på dansk og engelsk.

## Trin i rundvisningen
1. **Velkommen**: Kort intro til den digitale postkasse.
2. **Oversigt over post**: Her ser du alle nye breve og pakker med foto, dato og status.
3. **Vælg handling**: Tryk på et brev eller en pakke for at vælge forsendelse, scanning, afhentning eller destruering. Gratis dage er markeret.
4. **Book afhentning**: Vælg dag og tidsrum. Du får en e-mail med bekræftelsen, og tidspunktet kan ændres her.
5. **Scannede breve**: Åbn og download scannede breve. De gemmes i 30 dage.
6. **Arkiv**: Behandlede forsendelser kan arkiveres og gendannes.
7. **Vælg virksomhed** (kun hvis lejeren har flere): Skift mellem dine virksomheder.
8. **Notifikationer**: Klokken viser nye beskeder om post.
9. **Forsendelsesadresse**: Her retter du adressen. Du får en e-mail, når den er ændret.
10. **Automatisering**: Vælg hvad der automatisk skal ske med nye breve og pakker.
11. **Information**: Priser, betingelser og notifikationsmodtagere.
12. **Afslutning**: Du kan altid se rundvisningen igen under "Vis funktioner".

Findes et element ikke på skærmen, springes trinnet over. Det gælder fx når der ikke er post endnu, eller når der kun er én virksomhed. På mobil åbner menuen sig selv ved menu-trinnene.

## Tekniske detaljer
- Add the `react-joyride` library. A new `TenantTour` component renders inside the tenant `AppLayout` and is controlled by a small context, so it can be started from the sidebar.
- Add `data-tour="..."` attributes to the relevant elements in TenantDashboard, AppSidebar, TenantSelector and NotificationBell.
- Add `profiles.tour_completed_at timestamptz` (nullable) in a migration. Users can already update their own profile, so no new policy is needed. Auto-start only when it is NULL and `ShippingAddressGuard` is not blocking; set it on finish or skip.
- The sidebar item "Vis funktioner" (icon `Compass`) shows for tenants only. If the tenant is on another page, it navigates to `/` and then starts the tour.
- Add i18n keys `tour.*` and `nav.showFeatures` to da.json and en.json.
- Not shown in the operator's "Vis som lejer".

## Kontrol
- Test the tour in the browser as a tenant on desktop and mobile. Check that skipping works and that the tour does not start again by itself after it is finished.
