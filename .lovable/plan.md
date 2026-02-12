

## "Registrer og naeste" + "Tag billede" i dialogen

### Hvad aendres

**`src/components/RegisterMailDialog.tsx`** - to aendringer:

**1. Ny "Registrer og naeste" knap i DialogFooter (linje 808-813)**

Tilfoej en tredje knap mellem "Annuller" og "Registrer":

```text
DialogFooter:
  [Annuller]  [Registrer og naeste]  [Registrer]
```

- "Registrer og naeste" koerer samme logik som `handleSubmit`, men i stedet for at lukke dialogen (`onOpenChange(false)`) efter succes, nulstiller den kun formularen via `resetForm()` og viser kameraet med det samme.
- Implementeres ved at refaktorere `handleSubmit` til at tage en parameter `closeAfter: boolean`. Naar `closeAfter` er `false`, forbliver dialogen aaben og kameraet startes automatisk.

**2. "Tag nyt billede" knap naar foto allerede er taget (linje 555-590)**

Tilfoej en knap i crop-kontrol-omraadet (naar `!cropMode`) der giver mulighed for at tage et nyt billede uden at forlade dialogen:

```text
[Marker navn]  [Marker afsender]  [Marker forsendelsesnr.]
[Tag nyt billede]
```

- Knappen nulstiller foto-state (`setPhoto(null)`, `setPhotoPreview(null)`, etc.) og starter kameraet via `handleTakePhoto`.

### Teknisk detalje

`handleSubmit` refaktoreres:

```text
handleSubmit(closeAfter = true):
  ... eksisterende logik ...
  efter succes:
    resetForm()
    if (closeAfter):
      onOpenChange(false)
    else:
      handleTakePhoto()  // start kamera med det samme
```

DialogFooter bliver:

```text
<Button variant="outline" onClick={() => onOpenChange(false)}>Annuller</Button>
<Button variant="secondary" onClick={() => handleSubmit(false)} disabled={submitting}>
  Registrer og naeste
</Button>
<Button onClick={() => handleSubmit(true)} disabled={submitting}>
  Registrer
</Button>
```

### Resultat
- Operatoeren kan registrere post og straks tage naeste billede uden at lukke dialogen
- "Tag nyt billede" knap giver mulighed for at gentage billedet hvis det foerste var daarligt
- Ingen database-aendringer
