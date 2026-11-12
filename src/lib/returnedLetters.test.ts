import { describe, it, expect } from 'vitest';
import { canRespondToReturn, canMarkReturnResent, escapeReturnHtml, parseReturnShipmentNumbers, returnBlocksLetters, validReturnedShipment } from '../../supabase/functions/_shared/returned-letter-rules';
describe('returned envelopes', () => {
  it('links shipment 4107 and supports several shipment numbers', () => {
    expect(parseReturnShipmentNumbers('4107, 4126; 4107')).toEqual([4107, 4126]);
    expect(() => parseReturnShipmentNumbers('4107x')).toThrow();
    expect(() => parseReturnShipmentNumbers('')).toThrow();
  });
  it('blocks all letter dispatch until approval, including a declined return', () => {
    expect(['draft','notified','declined'].map(returnBlocksLetters)).toEqual([true,true,true]);
    expect(returnBlocksLetters('resend_requested')).toBe(false);
    expect(returnBlocksLetters('resent')).toBe(false);
  });
  it('only accepts previously sent letters belonging to the selected tenant', () => {
    const item = { tenant_id: 'anton', mail_type: 'brev', status: 'sendt_med_dao' };
    expect(validReturnedShipment(item, 'anton')).toBe(true);
    expect(validReturnedShipment(item, 'other')).toBe(false);
    expect(validReturnedShipment({ ...item, mail_type: 'pakke' }, 'anton')).toBe(false);
    expect(validReturnedShipment({ ...item, status: 'afventer_handling' }, 'anton')).toBe(false);
  });
  it('allows resend choice only after the operator has sent the approved email', () => {
    expect(canRespondToReturn('draft', 'resend_requested')).toBe(false);
    expect(canRespondToReturn('notified', 'resend_requested')).toBe(true);
  });
  it('accepts a refusal but never accepts a second response', () => {
    expect(canRespondToReturn('notified', 'declined')).toBe(true);
    expect(canRespondToReturn('resend_requested', 'declined')).toBe(false);
  });
  it('only completes a resend requested by the tenant', () => {
    expect(canMarkReturnResent('notified')).toBe(false);
    expect(canMarkReturnResent('resend_requested')).toBe(true);
  });
  it('escapes address and approved text in email HTML', () => {
    expect(escapeReturnHtml('<img> & "')).toBe('&lt;img&gt; &amp; &quot;');
  });
});