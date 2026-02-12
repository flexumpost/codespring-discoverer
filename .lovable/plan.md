

# To-kolonne layout for "Registrer ny post" med zoom

## Hvad aendres?
Dialogen "Registrer ny post" faar et bredere layout med to kolonner: billedet til venstre (stort nok til at laese) og inputfelterne til hoejre. Billedet faar en zoom-funktion saa operatoeren kan klikke for at se det i fuld stoerrelse.

## Layout

```text
+-----------------------------------------------+
| Registrer ny post                           X  |
+----------------------+------------------------+
|                      |  Posttype               |
|   [Foto / Kamera]    |  (o) Brev  ( ) Pakke   |
|                      |                         |
|   Stort preview      |  Forsendelsesnr.        |
|   af billedet        |  [_______________]      |
|   (klik for zoom)    |                         |
|                      |  Afsender               |
|                      |  [_______________]      |
|                      |                         |
|                      |  Lejer                  |
|                      |  [_______________]      |
|                      |                         |
|                      |  Noter                  |
|                      |  [_______________]      |
+----------------------+------------------------+
|              Annuller    Registrer              |
+------------------------------------------------+
```

## Teknisk implementering

### Fil: `src/components/RegisterMailDialog.tsx`

1. **Bredere dialog**: Aendr `sm:max-w-md` til `sm:max-w-3xl` for at give plads til to kolonner

2. **To-kolonne grid**: Naar et foto er taget/uploadet, vis indholdet i et `grid grid-cols-2 gap-6` layout:
   - Venstre kolonne: Foto-preview (stort, fylder hele kolonnen) med en klikbar overlay der aabner zoom
   - Hoejre kolonne: Posttype-valg og alle inputfelter

3. **Zoom-funktion**: Tilfoej en ny state `showZoom` (boolean). Naar brugeren klikker paa billedet, aabnes en ny `Dialog` (eller overlay) der viser billedet i fuld stoerrelse med mulighed for at lukke igen. Billedet i zoom-visningen faar `max-w-full max-h-[90vh]` saa det fylder saa meget som muligt.

4. **Foer foto er taget**: Upload/kamera-knapperne vises i fuld bredde (ingen to-kolonne layout endnu)

5. **Cursor og hint**: Billedet faar `cursor-zoom-in` og et lille forstoerrelsesglasikon i hjoernet for at indikere zoom-muligheden

