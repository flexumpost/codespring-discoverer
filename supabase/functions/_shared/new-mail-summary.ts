export type SummaryItem = { stamp_number: number | null; sender_name: string | null; mail_type: string };
export function normalizeSmsPhone(value: string): string | null {
  let phone = value.trim().replace(/[\s()-]/g, '');
  if (/^\d{8}$/.test(phone)) phone = '+45' + phone;
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}
export function mailSummary(items: SummaryItem[]) {
  const letters = items.filter(i => i.mail_type === 'brev').length;
  const packages = items.filter(i => i.mail_type === 'pakke').length;
  const count = [letters ? `${letters} ${letters === 1 ? 'brev' : 'breve'}` : '', packages ? `${packages} ${packages === 1 ? 'pakke' : 'pakker'}` : ''].filter(Boolean).join(' og ');
  const senders = [...new Set(items.map(i => i.sender_name?.trim() || 'Ukendt afsender'))].join(', ');
  const lines = items.map(i => `${i.mail_type === 'pakke' ? 'Pakke' : 'Brev'} ${i.stamp_number === null ? 'uden nr.' : '#' + i.stamp_number} — fra ${i.sender_name?.trim() || 'Ukendt afsender'}`);
  return { count, lines, sms: `Flexum: Du har modtaget ${count}. Fra: ${senders}.` };
}
export function escapeMailHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}