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
  return name === "Standard" || name === "Professional" || name === "Executive";
}

/** Letters shipped with porto included — no porto charged. */
export function lettersPortoIncluded(name: string | null | undefined): boolean {
  return name === "Plus" || name === "Standard" || name === "Professional" || name === "Executive";
}
