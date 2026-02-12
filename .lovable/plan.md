
# Logo og velkomsttekst i headeren

## Hvad der aendres
Teksten "Flexum Posthaandtering" i headeren erstattes med Flexum-logoet efterfulgt af "Hej [brugernavn]".

## Aendringer

### 1. Kopier logo til projektet
- Kopier det uploadede logo til `src/assets/flexum-logo.png`

### 2. Opdater `src/components/AppLayout.tsx`
- Importér logoet: `import flexumLogo from "@/assets/flexum-logo.png"`
- Importér `useAuth` fra `@/hooks/useAuth`
- Erstat `<h1>Flexum Posthaandtering</h1>` med:
  - Et `<img>` tag der viser logoet (hoejde ca. 28px)
  - Teksten "Hej [brugernavn]" til hoejre, hvor brugernavnet hentes fra `user?.user_metadata?.full_name` eller `user?.email` som fallback
