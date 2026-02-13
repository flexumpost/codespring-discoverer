## Vis scannet dokument i venstre kolonne i stedet for foto

Ændrer detalje-dialogen i lejer-dashboardet, så venstre kolonne viser en forhåndsvisning af det scannede dokument (fra `scan_url`) i stedet for fotoet af forsendelsen (`photo_url`).

### Hvad ændres

Den nuværende implementering viser `photo_url` (billedet af konvolutten) i venstre kolonne. I stedet skal `scan_url` (det scannede dokument fra storage-bucketen "mail-scans") vises der.

Da `scan_url` kræver en signeret URL fra storage, skal der tilføjes logik til at generere denne, når dialogen åbnes.

### Ændringer i `src/pages/TenantDashboard.tsx`

1. **Tilføj state og effekt for signeret scan-URL**: Når `selectedItem` ændres og har en `scan_url`, genereres en signeret URL via `supabase.storage.from("mail-scans").createSignedUrl(...)`.
2. **Erstat venstre kolonne**: I stedet for at vise `photo_url`, vises nu den signerede scan-URL. Layoutet skifter til 2-kolonner baseret på om der er en `scan_url` (ikke `photo_url`).
3. **Håndter PDF-filer**: Hvis scan-filen er en PDF, vises den i et `<iframe>` eller `<object>` tag. Hvis det er et billede, vises det som `<img>`.
4. **Behold download-knappen**: Download-knappen flyttes ned på linje med arkiver og luk knappen

### Tekniske detaljer


| Fil                             | Ændring                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/TenantDashboard.tsx` | Tilføj `scanSignedUrl` state + `useEffect` til at generere signeret URL. Erstat `photo_url`-betingelsen med `scan_url`-betingelsen i grid-layoutet. Vis PDF i iframe eller billede i img-tag. |


Strukturen bliver:

```text
+----------------------------------+------------------+
|                                  | Type: Brev       |
|                                  | Forsendelsesnr.  |
|   Forhåndsvisning af scannet     | Afsender         |
|   dokument (PDF/billede)         | Status           |
|   (2/3 bredde)                   | Valgt handling   |
|                                  | Modtaget         |
|                                  | Noter            |
|                                  | Download scan    |
+----------------------------------+------------------+
|        Download scan  |  Arkiver  |  Luk            |
+-----------------------------------------------------|
```

- Signeret URL genereres med 5 minutters gyldighed (300 sekunder)
- PDF-filer vises i en `<iframe>` med passende højde (`max-h-[70vh]`)
- Billedfiler vises med `object-contain` som nu
- Hvis der ikke er nogen `scan_url`, vises kun info-kolonnen i fuld bredde