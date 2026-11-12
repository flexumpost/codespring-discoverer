export function canRespondToReturn(status: string, response: string) {
  return status === 'notified' && ['resend_requested', 'declined'].includes(response);
}
export function canMarkReturnResent(status: string) {
  return status === 'resend_requested';
}
export function escapeReturnHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}