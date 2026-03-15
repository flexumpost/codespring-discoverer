

## Fix: Print-vindue er tomt

### Problem

`#envelope-print-container` er dybt nested inde i React's `#root` div. Print-CSS'en skjuler `body > *:not(#envelope-print-container)` — men det matcher `#root` (som er et direkte child af body), og da `#root` skjules, forsvinder alt indeni, inklusiv print-containeren.

### Løsning

Render `EnvelopePrint` via et **React Portal** direkte på `document.body`, så den bliver et direkte child af `<body>`. Dermed virker CSS-reglen korrekt.

**`src/components/EnvelopePrint.tsx`:**
- Wrap indholdet i `ReactDOM.createPortal(..., document.body)`
- Tilføj `useEffect` der kalder `window.print()` automatisk når komponenten mountes, og kalder `onAfterPrint` bagefter

**`src/pages/ShippingPrepPage.tsx`:**
- Ingen ændring nødvendig — `showPrint` state og `onAfterPrint` callback håndterer allerede flow'et

| Fil | Handling |
|---|---|
| `src/components/EnvelopePrint.tsx` | Wrap i portal + auto-print via useEffect |

