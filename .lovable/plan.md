

## Bloker søgemaskine-indexering + fix build-fejl

### Build-fejl
`bun.lock` blev utilsigtet redigeret i forrige besked. Filen skal gendannes til valid JSON-format. Kører `bun install` for at regenerere den.

### Ændringer

1. **`public/robots.txt`** — Bloker alle søgemaskiner:
   ```
   User-agent: *
   Disallow: /
   ```

2. **`index.html`** — Tilføj `noindex`/`nofollow` meta-tag i `<head>`:
   ```html
   <meta name="robots" content="noindex, nofollow" />
   ```

3. **Fix build** — Kør `bun install` for at gendanne `bun.lock`.

