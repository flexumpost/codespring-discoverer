## Hover-preview på fotos + ensartet størrelse

Begge sider bruger allerede samme foto-størrelse (`h-10 w-10`), så der er ingen ændring nødvendig der.

Hovedændringen er at tilføje en hover-effekt der viser billedet i stort format, når musen holdes over thumbnailet. Dette implementeres med den eksisterende `HoverCard`-komponent fra Radix UI.

### Ny komponent: `src/components/PhotoHoverPreview.tsx`

En genbrugelig komponent der wrapper et foto-thumbnail og viser en stor version ved hover:

- Viser thumbnailet (h-10 w-10) som trigger
- Ved hover vises billedet i stort format (ca. 600x600px) i en flydende popup
- Hvis der ikke er noget foto, vises det grå ImageIcon-placeholder (uden hover-effekt)

### Filer der ændres


| Fil                                    | Ændring                                          |
| -------------------------------------- | ------------------------------------------------ |
| `src/components/PhotoHoverPreview.tsx` | **Ny fil** - genbrugelig komponent med HoverCard |
| `src/pages/OperatorDashboard.tsx`      | Erstat foto-celle med `PhotoHoverPreview`        |
| `src/pages/TenantDashboard.tsx`        | Erstat foto-celle med `PhotoHoverPreview`        |


### Tekniske detaljer

Komponenten bruger `@radix-ui/react-hover-card` (allerede installeret) til at vise et stort billede ved mouseover. Popup'en har en bredde på 600px og viser billedet med korrekt aspect ratio. Der tilføjes en lille cursor-ændring (`cursor-zoom-in`) på thumbnailet for at signalere hover-funktionaliteten.