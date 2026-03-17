

## Problem

Knappen "Sæt din adgangskode →" vises som et almindeligt tekstlink i mange e-mailklienter (især Outlook) fordi den mangler vigtige CSS-egenskaber og en centreret wrapper.

## Årsag

`Button`-komponenten fra `@react-email/components` genererer et `<a>`-tag. Uden `display: inline-block` og en centrerende `<Section>`-wrapper ignorerer mange e-mailklienter `padding` og `background-color` på inline-elementer.

## Ændringer

**Fil: `supabase/functions/_shared/email-templates/invite.tsx`**

1. Importér `Section` fra `@react-email/components`
2. Wrap `<Button>` i en `<Section style={{ textAlign: 'center', margin: '32px 0' }}>`
3. Tilføj til `button`-stilen:
   - `display: 'inline-block'`
   - `fontWeight: '600'`
   - `msoLineHeightRule: 'exactly'` (Outlook-fix)

Samme ændring bør også gennemføres for de øvrige e-mailskabeloner (signup, recovery, magic-link, email-change, reauthentication) og `welcome.tsx` for konsistens – de bruger alle samme button-mønster.

Derefter redeployment af `auth-email-hook` og `send-welcome-email`.

