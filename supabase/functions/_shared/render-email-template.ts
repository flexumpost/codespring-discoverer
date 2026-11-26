export function formatDanishDate(date: Date): string {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function renderEmailTemplate(
  template: { subject: string; body: string },
  values: Record<string, string>,
): { subject: string; body: string } {
  const render = (text: string) => Object.entries(values).reduce(
    (result, [key, value]) => result.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      () => value,
    ),
    text,
  );

  return { subject: render(template.subject), body: render(template.body) };
}
