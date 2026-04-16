

## Fix: Porto opkræves per adressegruppe i stedet for per brev

### Problem
Breve grupperes fysisk efter adresse og sendes i én kuvert, men `sync-officernd-charge-batch` opkræver porto per brev. Resultat: Double Clicks fik opkrævet 2×18,40 kr. i stedet for 1×18,40 kr., og Total Services fik 2×46 kr. i stedet for 1×46 kr.

### Løsning
Ændr porto-logikken i batch-funktionen, så porto kun opkræves **én gang per unik adresse-kombination** per lejer (for breve). Pakker fortsætter med per-item porto.

### Ændringer

**1. `supabase/functions/sync-officernd-charge-batch/index.ts`**

I porto-sektionen (linje 411-481), erstat per-item iteration med adresse-gruppering for breve:
- For **breve**: Gruppér `tenantItems` efter `porto_option`. Opret kun 1 porto-opkrævning per unik `porto_option` per lejer (da alle breve til samme adresse allerede har fået tildelt samme porto_option via ShippingPrepPage's adresse-gruppering)
- For **pakker**: Behold per-item porto (hver pakke har unik vægt)
- Log porto-opkrævningen på det første brev i gruppen, og marker de resterende breve som `porto_included_in_group`

**2. Manuel korrektion**
De forkerte porto-opkrævninger for Double Clicks (18,40 kr.) og Total Services (46 kr.) skal slettes manuelt i OfficeRnD.

### Tekniske detaljer

Nuværende flow (linje 411):
```
for (const it of tenantItems) → 1 porto per item
```

Nyt flow:
```
// Group by porto_option for letters
const portoGroups = new Map<string, ItemData[]>();
for (const it of tenantItems) {
  if (it.mail_type !== 'pakke' && it.porto_option) {
    const key = it.porto_option;
    if (!portoGroups.has(key)) portoGroups.set(key, []);
    portoGroups.get(key)!.push(it);
  } else if (it.mail_type === 'pakke') {
    // Packages: individual porto as before
  }
}
// Create 1 porto charge per group
for (const [portoKey, groupItems] of portoGroups) {
  // Create charge for groupItems[0], mark rest as included
}
```

Porto-opkrævningens `description` inkluderer alle forsendelsesnumre i gruppen.

