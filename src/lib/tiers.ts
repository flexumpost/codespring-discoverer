/**
 * Central rules for tenant solutions (tiers).
 *
 * New solutions (Essential, Professional, Executive) reuse the behaviour of an
 * existing base tier and add a few differences:
 *  - Essential    → Standard rules (free every Thursday, 30 kr. extras, porto added)
 *  - Professional → Standard rules + free Monday AND Thursday, porto included on letters
 *  - Executive    → Plus rules (everything free all weekdays, 10 kr. packages),
 *                   letters shipped Monday + Thursday, porto included
 */

export const TIER_BASE: Record<string, string> = {
  Essential: "Standard",
  Professional: "Standard",
  Executive: "Plus",
};

export const NEW_TIERS = ["Essential", "Professional", "Executive"] as const;

/** Maps a tenant type name to the base tier whose rules it follows. */
export function baseTier<T extends string | undefined | null>(name: T): T {
  if (!name) return name;
  return (TIER_BASE[name as string] ?? name) as T;
}

/** Tiers whose free letter handling days are Monday + Thursday. */
const MON_THU_TIERS = new Set(["Standard", "Professional", "Executive"]);

export function hasMondayAndThursday(name: string | undefined | null): boolean {
  return !!name && MON_THU_TIERS.has(name);
}

/** Letters are shipped with porto included (no porto charged / no porto selection). */
export function lettersPortoIncluded(name: string | undefined | null): boolean {
  return name === "Plus" || name === "Standard" || name === "Professional" || name === "Executive";
}

/** Address must be written "c/o Flexum Coworking". */
export function requiresCo(name: string | undefined | null): boolean {
  return name === "Essential";
}

/** Next Monday or Thursday (today counts). */
export function getNextMondayOrThursday(from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 7; i++) {
    const dow = d.getDay();
    if (dow === 1 || dow === 4) return d;
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Next Thursday (today counts). */
export function getNextThursdayFrom(from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7));
  return d;
}

/**
 * Next free handling day for a letter/package of a given (raw) tier, for tiers
 * that are not "first Thursday of month" based. Packages always follow Thursday.
 */
export function getNextFreeDay(name: string | undefined | null, mailType: string = "brev"): Date {
  if (mailType !== "pakke" && hasMondayAndThursday(name)) return getNextMondayOrThursday();
  return getNextThursdayFrom();
}

export function isFreeWeekday(name: string | undefined | null, date: Date): boolean {
  const dow = date.getDay();
  if (hasMondayAndThursday(name)) return dow === 1 || dow === 4;
  return dow === 4;
}
