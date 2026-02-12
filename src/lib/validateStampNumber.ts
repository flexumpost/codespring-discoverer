/**
 * Validates an OCR-detected stamp number against recent known stamp numbers.
 * Rejects numbers that are likely barcodes (too long) or far outside the expected range.
 */
export function validateStampNumber(
  ocrNumber: string,
  recentNumbers: number[]
): { valid: boolean; reason?: string } {
  if (recentNumbers.length === 0) return { valid: true };

  // Calculate median length of known stamp numbers
  const lengths = recentNumbers.map((n) => String(n).length);
  const sorted = [...lengths].sort((a, b) => a - b);
  const medianLength = sorted[Math.floor(sorted.length / 2)];

  // Reject if more than double the median length (likely a barcode)
  if (ocrNumber.length > medianLength * 2) {
    return { valid: false, reason: "Nummer er for langt – muligvis stregkode" };
  }

  // Check if the number is within a reasonable range of recent numbers
  const num = parseInt(ocrNumber, 10);
  if (!isNaN(num)) {
    const maxRecent = Math.max(...recentNumbers);
    const minRecent = Math.min(...recentNumbers);
    if (num > maxRecent + 1000 || num < minRecent - 1000) {
      return { valid: false, reason: "Nummer ligger langt fra kendte forsendelsesnumre" };
    }
  }

  return { valid: true };
}
