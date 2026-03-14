

## Fix: Destruerede forsendelser forsvinder fra "Destrueres"-kortet

### Problem
Dataforespørgslen i `OperatorDashboard.tsx` (linje 319) filtrerer med `.in("status", ["ny", "afventer_handling", "ulaest", "laest"])`, hvilket udelukker `arkiveret` status helt. Når operatøren bekræfter destruktion og status sættes til `arkiveret`, forsvinder forsendelsen fra alle visninger.

### Løsning

**`src/pages/OperatorDashboard.tsx`** — én ændring:
- Tilføj `"arkiveret"` til status-filteret i `refreshMail()`, men kun for destruerede forsendelser. Den nemmeste tilgang er at fjerne `.in("status", ...)` filteret og i stedet filtrere `arkiveret` items ud client-side — undtagen dem med `chosen_action === "destruer"`.
- Alternativt (og bedre): Behold status-filteret, men tilføj en `.or()` der inkluderer `and(status.eq.arkiveret,chosen_action.eq.destruer)`.

Konkret ændring på linje 319:
```typescript
// Fra:
.in("status", ["ny", "afventer_handling", "ulaest", "laest"])

// Til:
.or("status.in.(ny,afventer_handling,ulaest,laest),and(status.eq.arkiveret,chosen_action.eq.destruer)")
```

Dette sikrer at destruerede forsendelser stadig hentes og vises i "Destrueres"-kortet med status "Forsendelse destrueret", men ikke tælles med i kortets tæller (den eksisterende `countFilter` håndterer dette allerede korrekt).

### Filer
- **Ændret**: `src/pages/OperatorDashboard.tsx` — udvid query-filteret til at inkludere arkiverede destruer-items

