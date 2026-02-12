

# Opret operatør-rolle for Rico Davidsen

## Hvad der skal ske
Rico Davidsen (rico@flexum.dk) er allerede oprettet som bruger, men mangler en rolle. Vi tildeler ham rollen **operator**, så han får adgang til operatør-dashboardet.

## Teknisk detalje
- Indsæt en ny række i `user_roles`-tabellen med Rico's bruger-ID og rollen `operator`
- Ingen kodeændringer nødvendige — systemet læser allerede roller fra denne tabel via `useAuth`-hooket

