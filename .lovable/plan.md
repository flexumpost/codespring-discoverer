

## Vis "Ubetalt faktura" markering på forsendelsessiden

### Oversigt
Vis en advarselsbadge ved lejernavnet på forsendelsessiden når lejeren har ubetalt faktura. Operatøren kan stadig sende forsendelserne.

### Ændringer

**`src/pages/ShippingPrepPage.tsx`**

1. **Udvid query** (linje ~146): Tilføj `has_unpaid_invoice` til select-strengen:
   ```
   tenants(company_name, has_unpaid_invoice, default_mail_action, ...)
   ```

2. **Udvid `MailItemWithTenant` type** (linje ~87): Tilføj `has_unpaid_invoice: boolean`.

3. **Map data** (linje ~152): Tilføj `has_unpaid_invoice: item.tenants?.has_unpaid_invoice ?? false`.

4. **Udvid grouped data**: Tilføj `has_unpaid_invoice` til `companies`-arrayet i grupperingen, så det er tilgængeligt per virksomhed.

5. **Vis badge**: Ved siden af lejernavnet og type-badge (linje ~443-453), vis en rød `Badge` med teksten "Ubetalt faktura" når `has_unpaid_invoice === true`:
   ```tsx
   {c.hasUnpaidInvoice && (
     <Badge variant="destructive" className="text-[10px] px-1.5 py-0 leading-4">
       Ubetalt faktura
     </Badge>
   )}
   ```

