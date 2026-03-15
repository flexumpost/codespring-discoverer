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
}): string {
  // 0. Sendt med DAO → blågrøn
  if (item.status === "sendt_med_dao") {
    return "bg-teal-200 dark:bg-teal-900/40";
  }

  // 0b. Sendt med PostNord → blågrøn (same as DAO)
  if (item.status === "sendt_med_postnord") {
    return "bg-teal-200 dark:bg-teal-900/40";
  }

  // 1. Destruer → rød
  if (item.chosen_action === "destruer") {
    return "bg-red-200 dark:bg-red-900/40";
  }

  // 2. Færdig (scannet, sendt eller afhentet) → grøn
  if (
    item.scan_url ||
    item.status === "laest" ||
    item.chosen_action === "under_forsendelse"
  ) {
    return "bg-green-200 dark:bg-green-900/40";
  }

  // 3. Skal scannes → blå
  if (
    item.chosen_action &&
    ["scan", "standard_scan"].includes(item.chosen_action) &&
    !item.scan_url
  ) {
    return "bg-blue-200 dark:bg-blue-900/40";
  }

  // 4. Skal sendes → orange
  if (
    item.chosen_action &&
    ["send", "standard_forsendelse", "daglig"].includes(item.chosen_action)
  ) {
    return "bg-orange-200 dark:bg-orange-800/40";
  }

  // 5. Skal afhentes → lilla
  if (
    item.chosen_action &&
    ["afhentning", "anden_afhentningsdag"].includes(item.chosen_action)
  ) {
    return "bg-purple-200 dark:bg-purple-900/40";
  }

  // 6. Ikke tildelt → gul
  if (!item.tenant_id) {
    return "bg-yellow-200 dark:bg-yellow-900/40";
  }

  // 7. Arkiveret → grå
  if (item.status === "arkiveret") {
    return "bg-gray-200 dark:bg-gray-900/40";
  }

  // 8. Ny / afventer → gul
  return "bg-yellow-100 dark:bg-yellow-900/30";
}
