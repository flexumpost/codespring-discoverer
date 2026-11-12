export function canRespondToReturn(status: string, response: string) {
  return status === 'notified' && ['resend_requested', 'declined'].includes(response);
}
export function canMarkReturnResent(status: string) {
  return status === 'resend_requested';
}
export function parseReturnShipmentNumbers(value: string) {
  const parts = value.trim().split(/[\s,;]+/).filter(Boolean);
  if (!parts.length || parts.length > 100 || parts.some(part => !/^[1-9]\d*$/.test(part) || !Number.isSafeInteger(Number(part)))) throw new Error('Indtast gyldige forsendelsesnumre, adskilt med komma.');
  return [...new Set(parts.map(Number))];
}
export function returnBlocksLetters(status: string) {
  return ['draft', 'notified', 'declined'].includes(status);
}
export function returnDispatchNotice(numbers: number[]) {
  return `Tidligere sendte forsendelser modtaget retur: ${numbers.join(', ')}. De samme breve lægges klar til genforsendelse, når du godkender i postkassen. Indtil godkendelsen sender vi ikke flere breve til dig. Vælger du nej, forbliver brevforsendelser på pause; kontakt Flexum.`;
}
export function validReturnedShipment(item: { tenant_id: string | null; mail_type: string; status: string }, tenantId: string) {
  return item.tenant_id === tenantId && item.mail_type === 'brev' && ['sendt_med_dao', 'sendt_med_postnord'].includes(item.status);
}
export function escapeReturnHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}