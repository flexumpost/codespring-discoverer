

## Plan: Fix postmodtagere ikke synlig på brugersiden

### Årsag
Tenant-ejeren `rico.davidsen@gmail.com` har **ingen rolle** i `user_roles`-tabellen. Det betyder `role` er `null` i appen.

Queryen i `SettingsPage.tsx` linje 97 har:
```typescript
enabled: !!selectedTenantId && role === "tenant",
```
Da `role` er `null` (ikke `"tenant"`), kører queryen **aldrig** — derfor vises ingen postmodtagere.

### Fix (2 ændringer)

**1. Database: Tilføj manglende rolle**
Indsæt `tenant`-rollen for ejeren:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('af6db4c8-9978-4470-9f10-d933fc991d55', 'tenant')
ON CONFLICT (user_id, role) DO NOTHING;
```

**2. Kode: Gør `enabled`-betingelsen mere robust**
Ændr `SettingsPage.tsx` linje 97 fra:
```typescript
enabled: !!selectedTenantId && role === "tenant",
```
til:
```typescript
enabled: !!selectedTenantId && role !== "operator",
```
Dette sikrer at queryen kører for alle ikke-operatører, uanset om rollen er `"tenant"` eller `null`.

