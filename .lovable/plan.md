

## Understøt linjeskift og fed tekst i Forklaring-feltet

### Hvad ændres

Forklaring-feltet er allerede et `<Textarea>` i editoren, så operatører kan skrive flere linjer. Problemet er at **visningen** i `PricingOverview.tsx` renderer teksten som ren tekst uden at respektere linjeskift eller formattering.

### Plan

| Fil | Ændring |
|---|---|
| `src/components/PricingOverview.tsx` | Erstat `{mail.forklaring}` og `{pkg.forklaring}` (hvis relevant) med en hjælpefunktion der: 1) Splitter på `\n` for linjeskift, 2) Parser `**tekst**` til `<strong>` for fed skrift, 3) Parser `##tekst` til overskrift-stil |
| `src/components/PricingOverview.tsx` | Tilsvarende for pakke-forklaring hvis den findes |

### Implementering

En simpel renderForklaring-funktion:

```typescript
function renderForklaring(text: string) {
  return text.split("\n").map((line, i) => {
    // Erstat **tekst** med <strong>
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      // Erstat ##tekst med fed overskrift
      if (part.startsWith("##")) {
        return <strong key={j} className="text-base">{part.slice(2).trim()}</strong>;
      }
      return part;
    });
    return <span key={i}>{parts}{i < text.split("\n").length - 1 && <br />}</span>;
  });
}
```

### Bemærk

Operatører kan allerede skrive linjeskift i textarea-feltet. De skal blot bruge `**tekst**` for fed og `##` i starten af en linje for overskrifter. Ingen ændring i editoren er nødvendig.

