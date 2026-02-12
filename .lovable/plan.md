
# Webcam-integration for "Tag billede"-knappen

## Hvad aendres?
"Tag billede"-knappen skal aabne webcam direkte i dialogen i stedet for at aabne filvaelgeren. Brugeren ser et live video-feed og kan klikke en knap for at tage billedet.

## Brugeroplevelse
1. Klik "Tag billede" -- webcam aktiveres og vises i dialogen
2. Live video-feed vises med en "Tag billede"-knap
3. Klik for at tage billedet -- billedet fanges og vises som preview
4. Brugeren kan slette billedet og tage et nyt

## Teknisk implementering

### Aendringer i `src/components/RegisterMailDialog.tsx`:

1. **Ny state**: `showCamera` (boolean) og en `useRef` til video-elementet og canvas

2. **`handleTakePhoto` funktion**: Kaldt direkte fra knappens `onClick` (kritisk for browser-sikkerhed). Kalder `navigator.mediaDevices.getUserMedia({ video: true })` med det samme i click-handleren

3. **`capturePhoto` funktion**: Tegner video-frame til et skjult canvas, konverterer til blob/fil, saetter `photo` og `photoPreview` state, og stopper kamera-stream

4. **`stopCamera` funktion**: Stopper alle video-tracks og nulstiller camera-state

5. **UI-tilstand**: Naar `showCamera` er true, vises et `<video>` element med live feed og en "Tag billede"/"Annuller" knap i stedet for upload-knapperne

6. **Oprydning**: `useEffect` cleanup der stopper kamera-stream naar dialogen lukkes
