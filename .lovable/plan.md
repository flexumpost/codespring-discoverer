

## Tilføj foto-hover-preview på forsendelseslinjer

### Ændring i `src/pages/ShippingPrepPage.tsx`

1. **Tilføj `photo_url` til query og type**: Inkludér `photo_url` i `.select()` og i `MailItemWithTenant`-typen.

2. **Import `PhotoHoverPreview`**: Genbrug den eksisterende komponent fra `@/components/PhotoHoverPreview`.

3. **Wrap forsendelseslinje med hover-preview**: I item-rækken (linje 378-389), tilføj `PhotoHoverPreview` før teksten, så hover over linjen viser fotoet.

```tsx
<label className="flex items-center gap-3 ...">
  <Checkbox ... />
  <PhotoHoverPreview photoUrl={item.photo_url} />
  <span className="text-sm font-medium">
    Nr. {item.stamp_number ?? "—"} — {item.company_name} — Gebyr: {getShippingFee(item)}
  </span>
</label>
```

### Fil
- `src/pages/ShippingPrepPage.tsx`

