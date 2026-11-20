import i18n from '@/i18n';
i18n.addResourceBundle('da', 'translation', { sms: {
  title: 'SMS-notifikationer', question: 'Vil du have en SMS, når du får ny post?',
  description: 'Vælg, om du vil modtage SMS om ny post til dine virksomheder.',
  phone: 'Mobilnummer', enabled: 'Modtag SMS om ny post', yes: 'Ja, tilmeld SMS', no: 'Nej tak',
  invalid: 'Indtast et gyldigt mobilnummer med landekode, fx +45.', saved: 'Dit SMS-valg er gemt', error: 'SMS-valget kunne ikke gemmes',
} }, true, true);
i18n.addResourceBundle('en', 'translation', { sms: {
  title: 'SMS notifications', question: 'Would you like a text when new mail arrives?',
  description: 'Choose whether to receive text messages about new mail for your companies.',
  phone: 'Mobile number', enabled: 'Receive texts about new mail', yes: 'Yes, enable texts', no: 'No thanks',
  invalid: 'Enter a valid mobile number including country code, e.g. +45.', saved: 'Your SMS preference has been saved', error: 'Could not save your SMS preference',
} }, true, true);