# SMS når et brev er scannet

## Resultat
- Når en operatør uploader den første scanning af et brev, lægges en SMS-besked i den eksisterende notifikationskø.
- Kun lejerens brugere med aktiv SMS-tilmelding og et gyldigt telefonnummer får beskeden.
- SMS’en lyder: ”Flexum Coworking\nDit brev er scannet og klar i din digitale postkasse”.
- Den eksisterende e-mail om scanning og SMS’en om ny post fortsætter uændret.

## Teknisk gennemførelse
- Udvid `new_mail_batches` med typen `scan_ready`, så scanninger og ny post kan ligge i kø samtidig uden at overskrive hinanden.
- Tilføj en database-trigger, som kun opretter en scanningsbesked, når `scan_url` går fra tom til udfyldt på et brev med en tilknyttet lejer.
- Lad `process-new-mail` sende kun SMS for `scan_ready`; almindelige nye-post-batches sender fortsat både e-mail og SMS efter to minutters samling.
- Bevar eksisterende kontrol af samtykke, modtagerlog og beskyttelse mod dobbeltafsendelse.

## Kontrol
- Tilføj tests for SMS-teksten og reglen om, at scanningsbeskeder kun opretter SMS-modtagere.
- Udrul databaseændringen og den opdaterede funktion.
- Opret midlertidige testdata og kontrollér kø og modtagervalg; send kun en rigtig test-SMS til 60 10 10 11, hvis det er godkendt.
