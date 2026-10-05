// Shared tenant solution (tier) rules — mirror of src/lib/tiers.ts.
export const TIER_BASE: Record<string, string> = {
  Essential: "Standard",
  Professional: "Standard",
  Executive: "Plus",
};

export function baseTier(name: string | null | undefined): string | null {
  if (!name) return name ?? null;
  return TIER_BASE[name] ?? name;
}

export function hasMondayAndThursday(name: string | null | undefined): boolean {
  return name === "Plus" || name === "Standard" || name === "Professional" || name === "Executive";
}

/** Letters shipped with porto included — no porto charged. */
export function lettersPortoIncluded(name: string | null | undefined): boolean {
  return name === "Plus" || name === "Standard" || name === "Professional" || name === "Executive";
}

/** True if a letter scan performed at `when` (Europe/Copenhagen) is free for this (raw) tier. */
export function isFreeScanDay(name: string | null | undefined, when: Date = new Date()): boolean {
  const base = baseTier(name);
  if (base === "Plus") return true;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen", day: "2-digit", weekday: "short" }).formatToParts(when);
  const day = Number(parts.find(p => p.type === "day")!.value);
  const wd = parts.find(p => p.type === "weekday")!.value;
  if (base === "Lite") return wd === "Thu" && day <= 7;
  if (wd === "Thu") return true;
  return wd === "Mon" && hasMondayAndThursday(name);
}
