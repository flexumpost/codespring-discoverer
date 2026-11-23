import i18n from '@/i18n';

i18n.addResourceBundle('da', 'translation', { singleEnvelope: {
  title: 'Print enkelt c4 kuvert', tenant: 'Lejer', choose: 'Vælg lejer eller anden modtager',
  search: 'Søg blandt alle lejere…', none: 'Ingen lejere fundet', other: 'Anden modtager',
  recipient: 'Navn / modtager', co: 'c/o', address: 'Adresse', address2: 'Adresselinje 2',
  zip: 'Postnummer', city: 'By', state: 'Stat / region', country: 'Land',
  print: 'Print kuvert', cancel: 'Annuller', loading: 'Indlæser lejere…',
  error: 'Lejerne kunne ikke indlæses', retry: 'Prøv igen',
} }, true, true);
i18n.addResourceBundle('en', 'translation', { singleEnvelope: {
  title: 'Print single C4 envelope', tenant: 'Tenant', choose: 'Choose tenant or another recipient',
  search: 'Search all tenants…', none: 'No tenants found', other: 'Another recipient',
  recipient: 'Name / recipient', co: 'c/o', address: 'Address', address2: 'Address line 2',
  zip: 'Postal code', city: 'City', state: 'State / region', country: 'Country',
  print: 'Print envelope', cancel: 'Cancel', loading: 'Loading tenants…',
  error: 'Could not load tenants', retry: 'Try again',
} }, true, true);