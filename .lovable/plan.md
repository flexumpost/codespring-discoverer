

## Scan Upload: Popup-dialog med drag-and-drop + inline drop på rækken

### Ændringer

#### 1. Ny komponent: `ScanUploadDialog.tsx`
En dialog (baseret på eksisterende `Dialog` komponent) som åbnes når man klikker "Upload scan". Indeholder:
- Drag-and-drop zone (lignende `BulkUploadDropzone` men for enkeltfil)
- Accepterer PDF, PNG, JPG/JPEG
- Viser upload-progress med spinner
- Bruger samme upload-logik som nuværende `ScanUploadButton` (upload til `mail-scans` bucket, opdater `mail_items`)

#### 2. Opdater `ScanUploadButton.tsx`
- Klik åbner dialogen i stedet for direkte fil-picker
- Tilføj drag-and-drop support direkte på knappen/rækken

#### 3. Opdater `OperatorDashboard.tsx` — inline drop på tabelrækken
- Wrap hver `TableRow` med drag-and-drop handlers for rækker der har scan-handlinger
- Når en fil droppes på rækken, uploades den direkte uden at åbne dialogen
- Visuel feedback (highlight) når man dragger over en gyldig række

### Teknisk flow
```text
Klik "Upload scan" → Dialog åbnes → Drag/drop eller vælg fil → Upload → Dialog lukkes
Drag fil over tabelrække → Række highlights → Drop → Upload direkte
```

### Filer der ændres/oprettes
- **Ny:** `src/components/ScanUploadDialog.tsx` — dialog med dropzone
- **Ændret:** `src/components/ScanUploadButton.tsx` — åbner dialog + eksponerer upload-funktion
- **Ændret:** `src/pages/OperatorDashboard.tsx` — inline drop-handlers på tabelrækker

