

## Scan-upload flow: Operatoer + Lejer opdateringer

### Overblik

Naar operatoeren uploader en scanning, skal tre ting ske:

1. **Operatoer-dashboard**: "Aaben og scan"-kortet taeller kun forsendelser UDEN scan (ikke alle med `chosen_action === "scan"`)
2. **Lejer-dashboard**: Status aendres til "Ulaest" og forsendelsen flyttes til "Ulaeste breve"-kortet
3. **Lejer-dashboard**: Scan-kolonnen viser et thumbnail af den scannede fil (billede) eller et ikon (PDF)

### Aendringer

**1. ScanUploadButton.tsx - Opdater status til "ulaest" ved upload**

Naar filen uploades, skal `status` ogsaa saettes til `"ulaest"` (udover at gemme `scan_url`):

```text
.update({ scan_url: path, status: "ulaest" })
```

Dette sikrer at forsendelsen automatisk flytter til "Ulaeste breve" paa lejer-dashboardet.

**2. OperatorDashboard.tsx - "Aaben og scan"-kortet taeller kun ikke-scannede**

Aendr filteret for "Aaben og scan"-kortet fra:

```text
filter: (item) => item.chosen_action === "scan"
```

til:

```text
filter: (item) => item.chosen_action === "scan" && !item.scan_url
```

Forsendelsen forbliver synlig i tabellen (den filtreres stadig med `chosen_action === "scan"` naar kortet klikkes), men kort-taelleren viser kun de ikke-scannede.

For at opnaa dette splittes logikken: kortet bruger et separat count-filter, mens tabel-filtreringen bevarer det nuvaerende filter (viser alle scan-forsendelser).

**3. TenantDashboard.tsx - Scan-kolonne med thumbnail**

I scan-kolonnen (linje 483-489), erstat det simple ikon med et faktisk thumbnail:

- For billeder (png/jpg): Vis et lille thumbnail via en signed URL fra storage
- For PDF-filer: Vis et PDF-ikon med "Scannet" tekst
- Thumbnailet genereres ved at oprette en signed URL til filen i `mail-scans` bucket

Da signed URLs kraever et async kald, oprettes en lille `ScanThumbnail`-komponent der haandterer dette.

### Teknisk detalje

**ScanUploadButton.tsx aendring:**
```text
// Linje 38-41: Tilfoej status: "ulaest"
const { error: updateError } = await supabase
  .from("mail_items")
  .update({ scan_url: path, status: "ulaest" })
  .eq("id", mailItemId);
```

**OperatorDashboard.tsx - To separate filtre:**
- Kort-taeller: `item.chosen_action === "scan" && !item.scan_url` (kun ikke-scannede)
- Tabel-filter naar kortet klikkes: `item.chosen_action === "scan"` (alle scan-forsendelser, ogsaa scannede)

Implementeres ved at tilfoeje et `countFilter` felt til `CardFilter`-typen:

```text
{
  title: "Aaben og scan",
  filter: (item) => item.chosen_action === "scan",         // tabel
  countFilter: (item) => item.chosen_action === "scan" && !item.scan_url,  // kort
}
```

**Ny komponent: ScanThumbnail**

En lille komponent der:
1. Modtager `scan_url` (sti i storage)
2. Opretter en signed URL via `supabase.storage.from("mail-scans").createSignedUrl(path, 300)`
3. Viser et thumbnail (40x40px) for billeder eller et PDF-ikon
4. Haandterer loading state

**TenantDashboard.tsx scan-celle:**
```text
<TableCell>
  {item.scan_url ? (
    <ScanThumbnail scanUrl={item.scan_url} />
  ) : (
    <span>-</span>
  )}
</TableCell>
```

### Filer der aendres
- `src/components/ScanUploadButton.tsx` - tilfoej `status: "ulaest"` til update
- `src/pages/OperatorDashboard.tsx` - split count/filter logik for scan-kort
- `src/pages/TenantDashboard.tsx` - scan-kolonne med thumbnail
- `src/components/ScanThumbnail.tsx` (ny) - thumbnail-komponent med signed URL

