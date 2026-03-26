

## Fix: Lejer kan ikke tilgå /settings

### Problem
Ruten `/settings` i `App.tsx` har `requiredRole="operator"`, så lejere bliver omdirigeret til `/` når de klikker på Indstillinger. SettingsPage-komponenten håndterer allerede begge roller internt (viser forskellige indhold baseret på `role`).

### Løsning
**1 fil**: `src/App.tsx`

Fjern `requiredRole="operator"` fra `/settings`-ruten, så den bliver:
```tsx
<Route
  path="/settings"
  element={
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  }
/>
```

Dette er den eneste ændring der kræves — SettingsPage viser allerede lejer-specifikt indhold når `role === "tenant"`.

