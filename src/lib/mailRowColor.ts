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
    return "bg-red-50 dark:bg-red-950/30";
  }

  // Not assigned to a tenant
  if (!item.tenant_id) {
    return "bg-yellow-50 dark:bg-yellow-950/30";
  }

  // Awaiting scan (action=scan but no scan uploaded yet)
  if (item.chosen_action === "scan" && !item.scan_url) {
    return "bg-blue-50 dark:bg-blue-950/30";
  }

  // Scanned / unread
  if (item.status === "ulaest") {
    return "bg-green-50 dark:bg-green-950/30";
  }

  // Read — no extra color
  if (item.status === "laest") {
    return "";
  }

  // Archived
  if (item.status === "arkiveret") {
    return "bg-gray-50 dark:bg-gray-950/30";
  }

  // Other actions (send, pickup, daily)
  if (item.chosen_action && ["send", "afhentning", "daglig"].includes(item.chosen_action)) {
    return "bg-purple-50 dark:bg-purple-950/30";
  }

  // New / no action
  if (item.status === "ny" || item.status === "afventer_handling") {
    return "bg-yellow-50 dark:bg-yellow-950/30";
  }

  return "";
}
