# Flexum Posthåndtering — Implementeringsplan

## Overblik

Posthåndteringssystem for Flexum Coworking med to brugerroller: **Operatører** (modtager og registrerer post) og **Lejere** (ser og vælger handling for deres post). Systemet bruger Lovable Cloud (Supabase) som backend.

---

## Fase 1: Fundament & Login

Opsætning af database, autentificering og app-struktur.

- **Login-side** med e-mail/password til operatører og lejere
- **Rollebaseret adgang** — operatører og lejere ser forskellige dashboards
- **Database-tabeller** for brugere, lejere, lejertyper (Lite/Standard/Plus/Fastlejer/Nabo/Retur til afsender) og postobjekter
- **App-layout** med sidebar-navigation, dansk som standardsprog
- **Lejertype-konfiguration** med tilladte handlinger og frekvenser pr. type

## Fase 2: Operatør-dashboard — Enkeltvis indtagelse

Operatøren kan registrere post én ad gangen.

- **Foto-upload** af brev/pakke (ét billede ad gangen via webcam)
- **Registreringsformular**: vælg modtager (lejer), brev/pakke, stempelnummer, afsender
- **Globalt stempelnummer** — auto-foreslå næste ledige nummer
- **Status-tags**: Ny (ikke tildelt modtager) → Afventer handling (når lejer har valgt handling
- **Oversigt over dagens post** med filtrering og søgning

## Fase 3: Lejer-portal

Lejere kan se og håndtere deres post.

- **Postoversigt** med billeder, zoom og statusfilter
- **Vælg handling** pr. postobjekt (videresend, scan, opbevar, destruer etc.)
- **Handlinger styret af lejertype** — kun tilladte muligheder vises
- **Status-tags**: Ny → Afventer handling → Ulæst → Læst → Arkiveret
- **2-trins bekræftelse** ved destruktion
- **Download scans** (PDF) og arkivér-knap

## Fase 4: Notifikationer & E-mail

Automatiske e-mails mellem operatør og lejer.

- **E-mail ved modtagelse** — lejer får besked om ny post
- **E-mail ved valgt handling** — operatør får besked om lejerens valg
- **E-mail ved udførelse** — lejer får bekræftelse
- Edge function til e-mail-afsendelse

## Fase 5: Bulk upload & OCR

Operatøren kan uploade mange kuvertbilleder på én gang.

- **Bulk upload** af billeder (drag & drop / filvalg)
- **OCR** via Lovable AI — læser adresselinje og stempelnummer
- **Auto-forslag til lejer** baseret på OCR-resultat
- **Trinvis gennemgang** — operatør bekræfter/korrigerer hvert forslag
- **Afslut batch** med notifikationer

## Fase 6: Scanning, forsendelser & administration

- **Scanning & filhåndtering** — PDF-upload og lagring i Supabase Storage
- **Forsendelses-batches** — ugentlige/månedlige forsendelser med pakkelister
- **Administration** — CRUD for lejere, adresser/aliaser, brugerroller, standardhandlinger

## Fase 7: GDPR, Audit & Rapporter

- **Audit log** — logning af alle handlinger
- **GDPR-retention** — automatisk sletning efter 12 måneder
- **Lejer hard-delete** uden gendannelse
- **Afregning** — registrering af prissatte handlinger
- **Simple rapporter** over postmængder og handlinger

## Fase 8 (fremtidig): Integrationer & Avanceret

- **OfficeRnD-integration** — one-way sync af lejere fra OfficeRnD
- **Sprog (da/en)** — fuld i18n-support
- **Fastlejer daglig håndtering** — specialflow for fastlejere