// Normalizes the c/o field: strips any existing "c/o" prefix (any casing,
// with or without colon/space) and re-adds a single "c/o " prefix.
// Returns null for empty input so the column stays NULL.
export function normalizeCo(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const stripped = v.replace(/^c\/o[:\s]*/i, "").trim();
  return stripped ? `c/o ${stripped}` : null;
}
