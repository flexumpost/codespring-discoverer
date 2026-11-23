import type { EnvelopeGroup } from '@/components/EnvelopePrint';

export interface EnvelopeTenant {
  id: string;
  company_name: string;
  shipping_recipient: string | null;
  shipping_co: string | null;
  shipping_address: string | null;
  shipping_address_2: string | null;
  shipping_zip: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_country: string | null;
}

export function singleEnvelope(tenant?: EnvelopeTenant): EnvelopeGroup {
  return {
    addressKey: tenant?.id ?? 'single-envelope',
    companies: [],
    shippingRecipient: tenant?.shipping_recipient || tenant?.company_name || '',
    shippingCo: tenant?.shipping_co ?? '',
    shippingAddress: tenant?.shipping_address ?? '',
    shippingAddress2: tenant?.shipping_address_2 ?? '',
    shippingZip: tenant?.shipping_zip ?? '',
    shippingCity: tenant?.shipping_city ?? '',
    shippingState: tenant?.shipping_state ?? '',
    shippingCountry: tenant?.shipping_country ?? '',
    printP: false,
  };
}

export function envelopePrintP(group: Pick<EnvelopeGroup, 'printP'>, automatic: boolean): boolean {
  return group.printP ?? automatic;
}