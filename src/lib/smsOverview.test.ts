import { describe, expect, it } from 'vitest';
import { buildSmsOverview } from './smsOverview';
const tenant = { id: 't1', company_name: 'Company', user_id: 'u1', is_active: true };
const profile = { id: 'u1', first_name: 'Person', last_name: null, email: 'person@example.com' };
describe('operator SMS overview', () => {
  it('shows personal consent once when a user belongs to several companies', () => {
    const rows = buildSmsOverview([tenant, { ...tenant, id: 't2' }], [profile], [{ tenant_id: 't1', user_id: 'u1' }], [{ user_id: 'u1', enabled: true, phone_number: '+4560101011', updated_at: '2026-11-24' }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].companies).toHaveLength(2);
    expect(rows[0].status).toBe('enabled');
    expect(rows[0].phone).toBe('+4560101011');
  });
  it('distinguishes no answer from a declined choice', () => {
    expect(buildSmsOverview([tenant], [profile], [], [])[0].status).toBe('pending');
    expect(buildSmsOverview([tenant], [profile], [], [{ user_id: 'u1', enabled: false, phone_number: null, updated_at: '2026-11-24' }])[0].status).toBe('declined');
  });
  it('excludes closed companies', () => {
    expect(buildSmsOverview([{ ...tenant, is_active: false }], [profile], [], [])).toEqual([]);
  });
});