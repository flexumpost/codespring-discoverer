export type MatchableTenant = {
  id: string;
  company_name: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
};

export type TenantMatch = { id: string; company_name: string; score: number };

const MIN_SUBSTRING_LEN = 5;

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

const wordBoundaryIncludes = (haystack: string, needle: string): boolean => {
  if (!needle) return false;
  // escape regex special chars
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i");
  return re.test(haystack);
};

/**
 * Match an OCR name against a list of tenants.
 * Scores:
 *   4 = exact company_name match
 *   3 = exact contact full-name match
 *   2 = word-boundary substring match on company_name (min length 5)
 *   1 = word-boundary substring match on contact name (min length 5)
 *   0 = no match
 */
export function fuzzyMatchTenant(
  name: string,
  tenants: MatchableTenant[]
): TenantMatch | null {
  if (!name) return null;
  const lower = norm(name);
  if (!lower) return null;

  const contactFull = (t: MatchableTenant) =>
    norm([t.contact_first_name, t.contact_last_name].filter(Boolean).join(" "));

  let best: TenantMatch | null = null;
  const consider = (t: MatchableTenant, score: number) => {
    if (!best || score > best.score) {
      best = { id: t.id, company_name: t.company_name, score };
    }
  };

  for (const t of tenants) {
    const company = norm(t.company_name);
    const contact = contactFull(t);

    if (company && company === lower) {
      consider(t, 4);
      continue;
    }
    if (contact && contact === lower) {
      consider(t, 3);
      continue;
    }

    // Substring / word-boundary matches, only when both sides are long enough
    // to avoid short generic tokens ("test", "EVT") matching random OCR text.
    if (company && Math.min(company.length, lower.length) >= MIN_SUBSTRING_LEN) {
      if (wordBoundaryIncludes(lower, company) || wordBoundaryIncludes(company, lower)) {
        consider(t, 2);
        continue;
      }
    }
    if (contact && Math.min(contact.length, lower.length) >= MIN_SUBSTRING_LEN) {
      if (wordBoundaryIncludes(lower, contact) || wordBoundaryIncludes(contact, lower)) {
        consider(t, 1);
      }
    }
  }

  return best;
}

/**
 * Given an OCR-detected recipient and sender, choose the best tenant match.
 * If the sender scores higher than the recipient, indicate a swap so the caller
 * can flip the two fields in the UI.
 */
export function pickBestTenantMatch(
  recipientName: string,
  senderName: string,
  tenants: MatchableTenant[]
): { match: TenantMatch | null; swap: boolean } {
  const rec = fuzzyMatchTenant(recipientName, tenants);
  const sen = fuzzyMatchTenant(senderName, tenants);
  const recScore = rec?.score ?? 0;
  const senScore = sen?.score ?? 0;
  if (recScore === 0 && senScore === 0) return { match: null, swap: false };
  if (senScore > recScore) return { match: sen, swap: true };
  return { match: rec, swap: false };
}
