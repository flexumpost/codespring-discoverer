import { describe, expect, it } from "vitest";
import { formatDanishDate, renderEmailTemplate } from "../../supabase/functions/_shared/render-email-template";

describe("dispatch email date", () => {
  it("replaces the date placeholder with the Danish dispatch date", () => {
    const result = renderEmailTemplate(
      {
        subject: "Din forsendelse er afsendt",
        body: "Din forsendelse (nr. {{stamp_number}}) er blevet afsendt den {{date}}.",
      },
      {
        stamp_number: "3925",
        date: formatDanishDate(new Date("2026-11-05T10:48:52.901Z")),
      },
    );

    expect(result.body).toBe("Din forsendelse (nr. 3925) er blevet afsendt den 5. november 2026.");
    expect(result.body).not.toContain("{{date}}");
  });
});
