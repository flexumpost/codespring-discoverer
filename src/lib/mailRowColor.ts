import type { Database } from "@/integrations/supabase/types";

type MailStatus = Database["public"]["Enums"]["mail_status"];

/**
 * Returns a Tailwind background class based on the mail item's current stage.
 * Priority order: destruer → færdig → scan → send → afhentning → ikke tildelt → ny/afventer
 */
export function getMailRowColor(item: {
  status: MailStatus;
  chosen_action: string | null;
  scan_url: string | null;
  tenant_id: string | null;
  effectiveAction?: string | null;
}): string {
  const action = item.effectiveAction ?? item.chosen_action;
  // 0. Sendt med DAO → grøn (Forsendelse gennemført)
  if (item.status === "sendt_med_dao") {
    return "bg-green-200 dark:bg-green-900/40";
  }

  // 0b. Sendt med PostNord → grøn (Forsendelse gennemført)
  if (item.status === "sendt_med_postnord") {
    return "bg-green-200 dark:bg-green-900/40";
  }

  // 0c. Sendt retur → orange
  if (item.status === "sendt_retur") {
    return "bg-orange-200 dark:bg-orange-900/40";
  }

  // 1. Arkiveret (ikke destruer) → grå
  if (item.status === "arkiveret" && item.chosen_action !== "destruer") {
    return "bg-gray-200 dark:bg-gray-900/40";
  }

  // 2. Destruer → rød
  if (action === "destruer") {
    return "bg-red-200 dark:bg-red-900/40";
  }

  // 3. Færdig (scannet eller læst) → grøn (Scanning gennemført / læst)
  if (item.scan_url || item.status === "laest") {
    return "bg-green-200 dark:bg-green-900/40";
  }

  // 3b. Under forsendelse → grøn (Forsendelse gennemført)
  if (action === "under_forsendelse") {
    return "bg-green-200 dark:bg-green-900/40";
  }

  // 4. Bestilt scanning → blå
  if (
    action &&
    ["scan", "standard_scan"].includes(action) &&
    !item.scan_url
  ) {
    return "bg-blue-200 dark:bg-blue-900/40";
  }

  // 5. Bestilt forsendelse → fersken/peach
  if (
    action &&
    ["send", "standard_forsendelse", "daglig"].includes(action)
  ) {
    return "bg-orange-100 dark:bg-orange-800/40";
  }

  // 6. Bestilt afhentning → pink
  if (
    action &&
    ["afhentning", "anden_afhentningsdag", "gratis_afhentning"].includes(action)
  ) {
    return "bg-pink-200 dark:bg-pink-900/40";
  }

  // 7. Ikke tildelt → gul
  if (!item.tenant_id) {
    return "bg-yellow-200 dark:bg-yellow-900/40";
  }

  // 8. Ny / afventer → gul
  return "bg-yellow-100 dark:bg-yellow-900/30";
}
