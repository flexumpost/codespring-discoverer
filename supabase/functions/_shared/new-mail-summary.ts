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
  const senders = [...new Set(items.map(i => i.sender_name?.trim() || 'Ukendt afsender'))].join('\n');
  const lines = items.map(i => `${i.mail_type === 'pakke' ? 'Pakke' : 'Brev'} ${i.stamp_number === null ? 'uden nr.' : '#' + i.stamp_number} — fra ${i.sender_name?.trim() || 'Ukendt afsender'}`);
  return { count, lines, sms: `Flexum Coworking\nDu har modtaget ${count} i din digitale postkasse\nFra:\n${senders}` };
}
export type NotificationKind = 'new_mail' | 'scan_ready';
function joinDanishList(values: string[]) {
  if (values.length <= 1) return values[0] ?? '';
  return `${values.slice(0, -1).join(', ')} og ${values[values.length - 1]}`;
}
export function scanSummary(items: SummaryItem[]) {
  const senders = joinDanishList([...new Set(items.map(i => i.sender_name?.trim() || 'Ukendt afsender'))]);
  const wording = items.length === 1 ? `Dit brev fra ${senders}` : `Dine breve fra ${senders}`;
  return { sms: `Flexum Coworking\n${wording} er scannet og klar i din digitale postkasse` };
}
export function notificationRecipients(kind: NotificationKind, emails: string[], phones: string[]) {
  return [
    ...(kind === 'new_mail' ? emails.map(recipient => ({ channel: 'email', recipient })) : []),
    ...phones.map(recipient => ({ channel: 'sms', recipient })),
  ];
}
export function escapeMailHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}