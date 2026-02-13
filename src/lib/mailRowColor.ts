import type { Database } from "@/integrations/supabase/types";

type MailStatus = Database["public"]["Enums"]["mail_status"];

/**
 * Returns a Tailwind background class based on the mail item's current stage.
 */
export function getMailRowColor(item: {
  status: MailStatus;
  chosen_action: string | null;
  scan_url: string | null;
  tenant_id: string | null;
}): string {
  // Destroy
  if (item.chosen_action === "destruer") {
    return "bg-red-200 dark:bg-red-900/40";
  }

  // Not assigned to a tenant
  if (!item.tenant_id) {
    return "bg-yellow-200 dark:bg-yellow-900/40";
  }

  // Awaiting scan (action=scan but no scan uploaded yet)
  if (item.chosen_action === "scan" && !item.scan_url) {
    return "bg-blue-200 dark:bg-blue-900/40";
  }

  // Scanned — has uploaded PDF (covers both ulaest and laest)
  if (item.scan_url) {
    return "bg-green-200 dark:bg-green-900/40";
  }

  // Scanned / unread (no scan_url but status is ulaest)
  if (item.status === "ulaest") {
    return "bg-[#fef18b] dark:bg-yellow-700/50";
  }

  // Read
  if (item.status === "laest") {
    return "bg-green-200 dark:bg-green-900/40";
  }

  // Archived
  if (item.status === "arkiveret") {
    return "bg-gray-200 dark:bg-gray-900/40";
  }

  // Other actions (send, pickup, daily)
  if (item.chosen_action && ["send", "afhentning", "daglig"].includes(item.chosen_action)) {
    return "bg-[#00aaeb]/30 dark:bg-[#00aaeb]/20";
  }

  // New / no action
  if (item.status === "ny" || item.status === "afventer_handling") {
    return "bg-yellow-200 dark:bg-yellow-900/40";
  }

  return "";
}
