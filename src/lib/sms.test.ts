import { describe, it, expect } from 'vitest';
import { mailSummary, normalizeSmsPhone, escapeMailHtml, scanSummary, notificationRecipients } from '../../supabase/functions/_shared/new-mail-summary';
describe('new mail notifications', () => {
  it('groups multiple letters with their numbers and senders', () => {
    const summary = mailSummary([{ mail_type: 'brev', stamp_number: 4107, sender_name: 'SKAT' }, { mail_type: 'brev', stamp_number: 4126, sender_name: 'Bank' }]);
    expect(summary.count).toBe('2 breve');
    expect(summary.lines).toEqual(['Brev #4107 — fra SKAT', 'Brev #4126 — fra Bank']);
  });
  it('distinguishes packages from letters', () => {
    expect(mailSummary([{ mail_type: 'brev', stamp_number: 1, sender_name: 'A' }, { mail_type: 'pakke', stamp_number: 2, sender_name: 'B' }]).count).toBe('1 brev og 1 pakke');
  });
  it('validates and normalizes international and Danish numbers', () => {
    expect(normalizeSmsPhone('12 34 56 78')).toBe('+4512345678');
    expect(normalizeSmsPhone('0044 7700 900123')).toBe('+447700900123');
    expect(normalizeSmsPhone('wrong')).toBeNull();
    expect(normalizeSmsPhone('')).toBeNull();
  });
  it('escapes sender names in email', () => expect(escapeMailHtml('<A&B>')).toBe('&lt;A&amp;B&gt;'));
  it('tells the tenant when one scanned letter is ready', () => {
    expect(scanSummary([{ mail_type: 'brev', stamp_number: 4107, sender_name: 'SKAT' }]).sms)
      .toBe('Flexum Coworking\nDit brev er scannet og klar i din digitale postkasse');
  });
  it('uses plural wording when several scanned letters are ready', () => {
    expect(scanSummary([{ mail_type: 'brev', stamp_number: 1, sender_name: 'A' }, { mail_type: 'brev', stamp_number: 2, sender_name: 'B' }]).sms)
      .toBe('Flexum Coworking\nDine breve er scannet og klar i din digitale postkasse');
  });
  it('creates only SMS deliveries for scan notifications', () => {
    expect(notificationRecipients('scan_ready', ['tenant@example.com'], ['+4560101011']))
      .toEqual([{ channel: 'sms', recipient: '+4560101011' }]);
  });
  it('keeps email and SMS deliveries for new mail', () => {
    expect(notificationRecipients('new_mail', ['tenant@example.com'], ['+4560101011']))
      .toEqual([{ channel: 'email', recipient: 'tenant@example.com' }, { channel: 'sms', recipient: '+4560101011' }]);
  });
});
