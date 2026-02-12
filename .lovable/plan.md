

## Intelligent afsender/modtager-korrektion via tenant-krydscheck

### Problem
OCR-modellen forveksler nogle gange afsender og modtager. I det konkrete tilfaelde blev "ROADRUNNERCARGO APS" (som er en kendt lejer) returneret som `sender_name`, mens "DANICA RAADGIVNING APS" (den reelle afsender) blev returneret som `recipient_name`.

### Loesning
Tilfoej en post-processing logik paa klientsiden der krydstjekker OCR-resultatet mod den kendte lejer-liste. Hvis `sender_name` matcher en lejer men `recipient_name` ikke goer, byttes de to vaerdier automatisk.

Logikken:

```text
1. Proev at matche recipient_name mod lejerlisten -> recipientMatch
2. Proev at matche sender_name mod lejerlisten -> senderMatch
3. Hvis recipientMatch IKKE fundet, men senderMatch fundet:
   -> Byt: recipient_name = sender_name, sender_name = original recipient_name
4. Ellers: behold som OCR returnerede
```

### Filer der aendres

**1. `src/components/RegisterMailDialog.tsx`**
- I `runOcr`-funktionen (efter OCR-resultatet modtages, ca. linje 168-200): tilfoej krydscheck-logik der bytter sender/recipient hvis sender matcher en lejer men recipient ikke goer
- Brug den eksisterende `fuzzyMatchTenant`-funktion til begge tjek

**2. `src/pages/BulkUploadPage.tsx`**
- I OCR-resultat-haaandteringen (ca. linje 144-161): tilfoej samme krydscheck-logik foer tenant-matching og item-opdatering
- Brug den eksisterende `fuzzyMatchTenant`-funktion

### Teknisk detalje

Krydscheck-funktionen der tilfoeejes begge steder:

```text
function smartSwapSenderRecipient(
  recipientName: string,
  senderName: string,
  tenants: TenantList
): { recipientName: string; senderName: string } {
  const recipientMatch = fuzzyMatchTenant(recipientName, tenants);
  const senderMatch = fuzzyMatchTenant(senderName, tenants);

  if (!recipientMatch && senderMatch) {
    // Sender er en kendt lejer -> byt
    return { recipientName: senderName, senderName: recipientName };
  }
  return { recipientName, senderName };
}
```

Ingen aendringer til edge function eller database.

