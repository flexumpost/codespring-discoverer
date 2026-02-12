

# Omarrangering af felter og obligatorisk-markering i "Registrer ny post"

## Hvad aendres?
Felterne i formularen omarrangeres og labels opdateres saa Lejer og Forsendelsesnr. markeres som obligatoriske.

## Ny feltrækkefølge (efter Posttype-valget)
1. **Lejer** (Obligatorisk) - fjern "(valgfrit)" fra label
2. **Forsendelsesnr.** (Obligatorisk) - fjern "(valgfrit)" fra label
3. **Afsender** (Valgfrit) - tilfoej "(valgfrit)" til label
4. **Noter** (Valgfrit) - beholder "(valgfrit)"

## Teknisk implementering

### Fil: `src/components/RegisterMailDialog.tsx`

1. **Flyt felterne** i `formFields`-sektionen til den nye raekkefoelge
2. **Opdater labels**:
   - "Lejer (valgfrit)" bliver til "Lejer"
   - "Forsendelsesnr. (valgfrit)" bliver til "Forsendelsesnr."
   - "Afsender" bliver til "Afsender (valgfrit)"
3. **Tilfoej validering** i `handleSubmit`: Tjek at `selectedTenantId` og `stampNumber` er udfyldt foer indsendelse, og vis en fejlbesked hvis ikke
4. Posttype-valget (Brev/Pakke radio-knapper) forbliver oeverst som foerste felt

