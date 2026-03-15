

## Forbedring af velkomst-e-mail: Layout, tekst og login-link

### Problem
1. **Dårlig tekstformatering**: `dangerouslySetInnerHTML` på en React Email `<Text>`-komponent håndterer `<br />`-tags og HTML-blokke dårligt — alt ender i ét `<p>`-tag
2. **Manglende login-link**: E-mailen indeholder ikke et link til lejerens postkasse

### Løsning

**Opdater `welcome.tsx`-skabelonen:**
- Fjern `dangerouslySetInnerHTML` og brug i stedet en `<Section>` med rå HTML via `__html`-injection direkte i container
- Tilføj en tydelig "Log ind"-knap (React Email `<Button>`) der linker til den publicerede app-URL (`https://codespring-discoverer.lovable.app/login`)
- Forbedre styling: bedre spacing, tydeligere hierarki

**Opdater `send-welcome-email/index.ts`:**
- Send `loginUrl` som prop til skabelonen
- Konverter newlines i body-teksten til korrekt HTML (`<p>`-tags i stedet for `<br />`)

### Ændrede filer

| Fil | Ændring |
|---|---|
| `supabase/functions/_shared/email-templates/welcome.tsx` | Ny layout med korrekt HTML-body rendering + login-knap |
| `supabase/functions/send-welcome-email/index.ts` | Send `loginUrl` prop, brug `<p>`-tags for linjeskift |

### Skabelon-struktur (efter ændring)

```text
┌─────────────────────────────┐
│  [Flexum logo]              │
│                             │
│  Velkommen, {name}!         │
│                             │
│  {body tekst med korrekte   │
│   linjeskift/paragraffer}   │
│                             │
│  ┌─────────────────────┐    │
│  │  Log ind i din       │    │
│  │  postkasse  →        │    │
│  └─────────────────────┘    │
│                             │
│  Denne e-mail er sendt...   │
└─────────────────────────────┘
```

