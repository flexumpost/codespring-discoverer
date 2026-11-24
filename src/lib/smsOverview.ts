export type SmsStatus = 'enabled' | 'declined' | 'pending';
type Tenant = { id: string; company_name: string; user_id: string | null; is_active: boolean };
type Profile = { id: string; first_name: string | null; last_name: string | null; email: string };
type Membership = { tenant_id: string; user_id: string };
type Preference = { user_id: string; enabled: boolean; phone_number: string | null; updated_at: string };
export function buildSmsOverview(tenants: Tenant[], profiles: Profile[], memberships: Membership[], preferences: Preference[]) {
  const profileById = new Map(profiles.map(p => [p.id, p]));
  const preferenceById = new Map(preferences.map(p => [p.user_id, p]));
  const companies = new Map<string, { id: string; name: string }[]>();
  for (const tenant of tenants) {
    if (!tenant.is_active) continue;
    const users = new Set(memberships.filter(m => m.tenant_id === tenant.id).map(m => m.user_id));
    if (tenant.user_id) users.add(tenant.user_id);
    for (const id of users) companies.set(id, [...(companies.get(id) ?? []), { id: tenant.id, name: tenant.company_name }]);
  }
  return [...companies].flatMap(([userId, tenants]) => {
    const profile = profileById.get(userId);
    if (!profile) return [];
    const preference = preferenceById.get(userId);
    const status: SmsStatus = !preference ? 'pending' : preference.enabled ? 'enabled' : 'declined';
    return [{ userId, companies: tenants, name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email,
      email: profile.email, phone: preference?.phone_number ?? null, updatedAt: preference?.updated_at ?? null, status }];
  }).sort((a, b) => a.companies[0].name.localeCompare(b.companies[0].name, 'da'));
}