
# Tilfoej foto-thumbnail og ny kolonneraekkefoelge i post-tabellen

## Hvad aendres?
Tabellen paa `/mail`-siden faar en ny foerste kolonne med et lille thumbnail af det uploadede foto, og kolonnerne omarrangeres. Kolonnen "Afsender" fjernes fra tabellen.

## Ny kolonneraekkefoelge
1. **Foto** (thumbnail) -- ny kolonne
2. **Type** (brev/pakke badge)
3. **Lejer** (virksomhedsnavn)
4. **Forsendelsesnr.**
5. **Status**
6. **Modtaget** (dato)

## Teknisk implementering

### Fil: `src/pages/MailPage.tsx`

- Tilfoej en `<TableHead>Foto</TableHead>` som foerste kolonne i header
- Tilfoej en `<TableCell>` som foerste celle i hver raekke, der viser:
  - Et `<img>` thumbnail (ca. 40x40px, `object-cover`, afrundede hjoerner) hvis `item.photo_url` findes
  - Et placeholder-ikon (f.eks. `ImageIcon` fra lucide-react) hvis der ikke er noget foto
- Fjern "Afsender"-kolonnen (header og celle)
- Behold resten af kolonnerne i den nye raekkefoelge: Type, Lejer, Forsendelsesnr., Status, Modtaget

Billedets URL hentes direkte fra `item.photo_url`, som allerede indeholder den fulde URL til storage-bucketen.
