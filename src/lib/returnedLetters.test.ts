import { describe, it, expect } from 'vitest';
import { canRespondToReturn, canMarkReturnResent, escapeReturnHtml } from '../../supabase/functions/_shared/returned-letter-rules';
describe('returned envelopes', () => {
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