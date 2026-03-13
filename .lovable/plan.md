

## Plan: Gruppér forsendelser efter forsendelsesadresse og vis virksomhedsnavne

### Oversigt
I stedet for at gruppere kort efter enkelt virksomhed, grupperes de nu efter **forsendelsesadresse**. Virksomheder med samme adresse samles i ét kort, så operatøren kan pakke dem samlet.

### Ændringer i `src/pages/ShippingPrepPage.tsx`

1. **Udvid query** — tilføj `shipping_recipient, shipping_co, shipping_address, shipping_zip, shipping_city` fra `tenants`-joinet, og opdater `MailItemWithTenant`-typen tilsvarende.

2. **Ny grupperingslogik** — i stedet for at gruppere på `tenant_id`, grupperes på en sammensat nøgle af forsendelsesadressen (`shipping_address + shipping_zip + shipping_city`). Hvert kort indeholder items fra potentielt flere virksomheder.

3. **Kort-header (gule felter)** — vis alle virksomhedsnavne der har breve i gruppen, f.eks. "Firma A, Firma B".

4. **Forsendelsesadresse (røde linier)** — vis den fulde forsendelsesadresse under virksomhedsnavnene i card-headeren: modtager, c/o, adresse, postnr. + by.

5. **Brev-linie (grønt felt)** — tilføj virksomhedsnavnet efter forsendelsesnummeret på hver brev-linie: "Nr. 42 — Firma A".

6. **Færdig-knap** — opdater `doneGroups` til at bruge adresse-nøglen i stedet for `tenantId`.

### Eksempel på visning

```text
┌──────────────────────────────────────────────┐
│ Firma A, Firma B                    [Færdig] │  ← gul: virksomhedsnavne
│ Hans Hansen                                  │  ← rød: forsendelsesadresse
│ c/o Kontorfællesskabet                       │
│ Vestergade 12                                │
│ 1456 København K                             │
├──────────────────────────────────────────────┤
│ ☐ Nr. 42 — Firma A                          │  ← grøn: virksomhedsnavn
│ ☐ Nr. 43 — Firma A                          │
│ ☐ Nr. 51 — Firma B                          │
└──────────────────────────────────────────────┘
```

