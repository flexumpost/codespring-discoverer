

## Fix: Print-orientering på C4-kuverter

### Problem

Browsere håndterer `@page { size: 324mm 229mm; }` inkonsekvent — nogle ignorerer de eksplicitte dimensioner og sender altid portrait til printeren, uanset printerindstillinger.

### Løsning

Tilføj det eksplicitte `landscape` keyword til `@page` reglen i `src/components/EnvelopePrint.tsx`:

```css
@page {
  size: 229mm 324mm landscape;
  margin: 0;
}
```

Ved at angive papirstørrelsen i portrait-format (229×324) + `landscape` keyword, fortæller vi browseren entydigt at rotere outputtet. Dette er mere kompatibelt på tværs af browsere og printerdrivere.

| Fil | Ændring |
|---|---|
| `src/components/EnvelopePrint.tsx` | Ændr `@page size` til `229mm 324mm landscape` |

