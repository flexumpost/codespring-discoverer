import { describe, expect, it } from 'vitest';
import { envelopePrintP, singleEnvelope } from './singleEnvelope';

describe('single C4 envelope', () => {
  it('fills every shipping field from the selected tenant', () => {
    expect(singleEnvelope({ id: 'tenant', company_name: 'Firma ApS', shipping_recipient: 'Modtager', shipping_co: 'Kontakt', shipping_address: 'Vej 1', shipping_address_2: '2. sal', shipping_zip: '2100', shipping_city: 'København Ø', shipping_state: 'Region', shipping_country: 'Danmark' }))
      .toEqual({ addressKey: 'tenant', companies: [], shippingRecipient: 'Modtager', shippingCo: 'Kontakt', shippingAddress: 'Vej 1', shippingAddress2: '2. sal', shippingZip: '2100', shippingCity: 'København Ø', shippingState: 'Region', shippingCountry: 'Danmark', printP: false });
  });
  it('allows a recipient without a tenant', () => {
    const envelope = { ...singleEnvelope(), shippingRecipient: 'Privat modtager', shippingAddress: 'Vej 2' };
    expect(envelope.companies).toEqual([]);
    expect(envelope.shippingRecipient).toBe('Privat modtager');
    expect(envelope.shippingAddress).toBe('Vej 2');
  });
  it('prints P when checked even without a Plus tenant', () => {
    expect(envelopePrintP({ printP: true }, false)).toBe(true);
  });
  it('does not print P when unchecked', () => {
    expect(envelopePrintP({ printP: false }, true)).toBe(false);
  });
  it('preserves automatic P markings for existing batch printing', () => {
    expect(envelopePrintP({}, true)).toBe(true);
    expect(envelopePrintP({}, false)).toBe(false);
  });
});