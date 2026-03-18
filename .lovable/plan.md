

## Opdater profil for regnskab@flexum.dk

Profilen for `regnskab@flexum.dk` (id: `efbf4e1a-...`) har tomme navnefelter. 

### Ændring

Opdater `profiles`-tabellen:

```sql
UPDATE profiles 
SET first_name = 'Torben', last_name = 'Jensen'
WHERE id = 'efbf4e1a-f7be-4ae6-9086-ef00e1004360';
```

Efter denne opdatering vil headeren vise "Godmorgen Torben" i stedet for e-mailadressen.

