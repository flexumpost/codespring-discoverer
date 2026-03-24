import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ScanLine, ShieldX, AlertTriangle, Archive, HandCoins } from "lucide-react";
import { PhotoHoverPreview } from "@/components/PhotoHoverPreview";
import { ScanThumbnail } from "@/components/ScanThumbnail";
import type { Tables, Database } from "@/integrations/supabase/types";

type MailItem = Tables<"mail_items"> & {
  tenants?: {
    company_name: string;
    default_mail_action: string | null;
    default_package_action: string | null;
    tenant_types?: { name: string } | null;
  } | null;
};

interface OperatorMailItemDialogProps {
  item: MailItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onReassignTenant: () => void;
}

export function OperatorMailItemDialog({
  item,
  open,
  onOpenChange,
  onSaved,
  onReassignTenant,
}: OperatorMailItemDialogProps) {
  const { t } = useTranslation();
  const [stampNumber, setStampNumber] = useState(item.stamp_number?.toString() ?? "");
  const [senderName, setSenderName] = useState(item.sender_name ?? "");
  const [mailType, setMailType] = useState<Database["public"]["Enums"]["mail_type"]>(item.mail_type);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deletingScan, setDeletingScan] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [confirmingDestruction, setConfirmingDestruction] = useState(false);
  const [operatorAction, setOperatorAction] = useState<string>("");
  const [executingAction, setExecutingAction] = useState(false);
  const [showOperatorActionConfirm, setShowOperatorActionConfirm] = useState(false);

  const isDestroyed = item.chosen_action === "destruer" && item.status === "arkiveret";
  const isPendingDestruction = item.chosen_action === "destruer" && item.status !== "arkiveret";
  const isPickedUp = item.chosen_action === "afhentet" && item.status === "arkiveret";
  const isArchivedByUser = item.status === "arkiveret" && item.chosen_action !== "destruer" && item.chosen_action !== "afhentet";
  const isSent = item.status === "sendt_med_dao" || item.status === "sendt_med_postnord";
  const isSentRetur = item.status === "sendt_retur";
  const isFinalized = isDestroyed || isPickedUp || isSent || isSentRetur || item.status === "arkiveret";
  const [reactivating, setReactivating] = useState(false);

  const handleReactivate = async () => {
    setReactivating(true);
    const { error } = await supabase
      .from("mail_items")
      .update({ status: "afventer_handling" as any, chosen_action: null })
      .eq("id", item.id);
    setReactivating(false);
    if (error) {
      toast.error(t("operatorMailItem.couldNotReactivate"));
      console.error(error);
    } else {
      toast.success(t("operatorMailItem.reactivated"));
      onSaved();
      onOpenChange(false);
    }
  };

  const handleConfirmDestruction = async () => {
    setConfirmingDestruction(true);
    const { error } = await supabase
      .from("mail_items")
      .update({ status: "arkiveret" as any })
      .eq("id", item.id);
    setConfirmingDestruction(false);
    if (error) {
      toast.error(t("operatorMailItem.couldNotConfirmDestruction"));
      console.error(error);
    } else {
      toast.success(t("operatorMailItem.destructionConfirmed"));
      onSaved();
      onOpenChange(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const noteChanged = (notes || null) !== (item.notes || null);
    const updateData: Record<string, any> = {
      stamp_number: stampNumber ? parseInt(stampNumber, 10) : null,
      sender_name: senderName || null,
      mail_type: mailType,
      notes: notes || null,
    };
    if (noteChanged && notes) {
      updateData.note_read = false;
    }
    const { error } = await supabase
      .from("mail_items")
      .update(updateData)
      .eq("id", item.id);

    setSaving(false);
    if (error) {
      toast.error(t("operatorMailItem.couldNotSave"));
      console.error(error);
    } else {
      toast.success(t("operatorMailItem.changesSaved"));
      onSaved();
      onOpenChange(false);
    }
  };

  const handleDeleteScan = async () => {
    if (!item.scan_url) return;
    setDeletingScan(true);
    const { error: storageError } = await supabase.storage
      .from("mail-scans")
      .remove([item.scan_url]);
    if (storageError) console.error("Storage delete error:", storageError);
    const { error } = await supabase
      .from("mail_items")
      .update({ scan_url: null, scanned_at: null })
      .eq("id", item.id);
    setDeletingScan(false);
    if (error) {
      toast.error(t("operatorMailItem.couldNotDeleteScan"));
      console.error(error);
    } else {
      toast.success(t("operatorMailItem.scanDeleted"));
      onSaved();
      onOpenChange(false);
    }
  };

  const handleDeleteItem = async () => {
    setDeletingItem(true);
    if (item.photo_url) {
      let photoPath = item.photo_url;
      const marker = "/mail-photos/";
      const idx = item.photo_url.indexOf(marker);
      if (idx !== -1) photoPath = item.photo_url.substring(idx + marker.length);
      if (photoPath) await supabase.storage.from("mail-photos").remove([photoPath]);
    }
    if (item.scan_url) await supabase.storage.from("mail-scans").remove([item.scan_url]);
    const { error } = await supabase.from("mail_items").delete().eq("id", item.id);
    setDeletingItem(false);
    if (error) {
      toast.error(t("operatorMailItem.couldNotDeleteShipment"));
      console.error(error);
    } else {
      toast.success(t("operatorMailItem.shipmentDeleted"));
      onSaved();
      onOpenChange(false);
    }
  };

  const handleRejectAction = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    const { error } = await supabase
      .from("mail_items")
      .update({
        chosen_action: null,
        action_rejected_reason: rejectReason.trim(),
        note_read: false,
        status: "ny" as any,
      })
      .eq("id", item.id);
    setRejecting(false);
    if (error) {
      toast.error(t("operatorMailItem.couldNotReject"));
      console.error(error);
    } else {
      toast.success(t("operatorMailItem.actionRejected"));
      setShowRejectDialog(false);
      onSaved();
      onOpenChange(false);
    }
  };

  const handleOperatorAction = async () => {
    setExecutingAction(true);
    let updateData: Record<string, any> = {};
    if (operatorAction === "afhentet") {
      updateData = { chosen_action: "afhentet", status: "arkiveret" };
    } else if (operatorAction === "destruer") {
      updateData = { chosen_action: "destruer", status: "arkiveret" };
    } else if (operatorAction === "sendt") {
      updateData = { chosen_action: "under_forsendelse", status: "sendt_med_dao" };
    } else if (operatorAction === "sendt_retur") {
      updateData = { chosen_action: "sendt_retur", status: "sendt_retur" };
    }
    const { error } = await supabase
      .from("mail_items")
      .update(updateData)
      .eq("id", item.id);
    setExecutingAction(false);
    if (error) {
      toast.error(t("operatorMailItem.couldNotExecute"));
      console.error(error);
    } else {
      const labels: Record<string, string> = {
        afhentet: t("operatorMailItem.markedPickedUp"),
        destruer: t("operatorMailItem.markedDestroyed"),
        sendt: t("operatorMailItem.markedSent"),
        sendt_retur: t("operatorMailItem.markedSentReturn"),
      };
      toast.success(labels[operatorAction] || t("operatorMailItem.actionExecuted"));
      setShowOperatorActionConfirm(false);
      setOperatorAction("");
      onSaved();
      onOpenChange(false);
    }
  };

  const operatorActionLabels: Record<string, string> = {
    afhentet: t("operatorMailItem.markAsPickedUp"),
    destruer: t("operatorMailItem.markAsDestroyed"),
    sendt: t("operatorMailItem.markAsSent"),
    sendt_retur: t("operatorMailItem.markAsSentReturn"),
  };

  const operatorActionDescriptions: Record<string, string> = {
    afhentet: t("operatorMailItem.pickedUpDesc"),
    destruer: t("operatorMailItem.destroyDesc"),
    sendt: t("operatorMailItem.sentDesc"),
    sendt_retur: t("operatorMailItem.sentReturnDesc"),
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("operatorMailItem.title")}</DialogTitle>
          {isDestroyed && (
            <Badge variant="destructive" className="mt-2">{t("operatorMailItem.destroyed")}</Badge>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {(item.photo_url || item.scan_url) && (
            <div className="flex items-start gap-4">
              {item.photo_url && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("common.photo")}</Label>
                  <PhotoHoverPreview photoUrl={item.photo_url} />
                </div>
              )}
              {item.scan_url && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">{t("common.scan")}</Label>
                  <ScanThumbnail scanUrl={item.scan_url} />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-muted-foreground">{t("operatorMailItem.tenant")}</Label>
              <p className="text-sm font-medium">
                {item.tenants?.company_name ?? (
                  <span className="text-destructive">{t("common.notAssigned")}</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onReassignTenant(); onOpenChange(false); }}
            >
              {t("operatorMailItem.changeTenant")}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stamp">{t("operatorMailItem.stampNumber")}</Label>
              <Input id="stamp" value={stampNumber} onChange={(e) => setStampNumber(e.target.value)} placeholder={t("operatorMailItem.numberPlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sender">{t("operatorMailItem.sender")}</Label>
              <Input id="sender" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder={t("operatorMailItem.senderPlaceholder")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("operatorMailItem.type")}</Label>
            <Select value={mailType} onValueChange={(v) => setMailType(v as Database["public"]["Enums"]["mail_type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="brev">{t("common.letter")}</SelectItem>
                <SelectItem value="pakke">{t("common.package")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("operatorMailItem.notes")}</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("operatorMailItem.notesPlaceholder")} rows={3} />
          </div>

          {isArchivedByUser && (
            <div className="flex items-center justify-between rounded-md border border-blue-300 bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{t("operatorMailItem.archivedByUser")}</span>
              </div>
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100" onClick={handleReactivate} disabled={reactivating}>
                {reactivating ? t("common.reactivating") : t("common.reactivate")}
              </Button>
            </div>
          )}

          {isPendingDestruction && (
            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">{t("operatorMailItem.pendingDestruction")}</span>
              </div>
              <Button variant="destructive" size="sm" onClick={handleConfirmDestruction} disabled={confirmingDestruction}>
                {confirmingDestruction ? t("operatorMailItem.confirming") : t("operatorMailItem.confirmDestruction")}
              </Button>
            </div>
          )}

          {item.chosen_action && !isPendingDestruction && !isDestroyed && (
            <div className="flex items-center justify-between rounded-md border border-orange-300 bg-orange-50 p-3">
              <div className="flex items-center gap-2">
                <ShieldX className="h-4 w-4 text-orange-600" />
                <span className="text-sm">{t("operatorMailItem.requestedAction")}: <strong>{item.chosen_action}</strong></span>
              </div>
              <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100" onClick={() => setShowRejectDialog(true)}>
                {t("operatorMailItem.rejectAction")}
              </Button>
            </div>
          )}

          {!isFinalized && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <HandCoins className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t("operatorMailItem.operatorAction")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={operatorAction} onValueChange={setOperatorAction}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("operatorMailItem.selectAction")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="afhentet">{t("operatorMailItem.markAsPickedUp")}</SelectItem>
                    <SelectItem value="destruer">{t("operatorMailItem.markAsDestroyed")}</SelectItem>
                    <SelectItem value="sendt">{t("operatorMailItem.markAsSent")}</SelectItem>
                    <SelectItem value="sendt_retur">{t("operatorMailItem.markAsSentReturn")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={!operatorAction} onClick={() => setShowOperatorActionConfirm(true)}>
                  {t("common.execute")}
                </Button>
              </div>
            </div>
          )}

          {item.scan_url && (
            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-destructive" />
                <span className="text-sm">{t("operatorMailItem.attachedScan")}</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deletingScan}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {t("operatorMailItem.deleteScan")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("operatorMailItem.deleteScanConfirm")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("operatorMailItem.deleteScanDesc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteScan} disabled={deletingScan}>
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deletingItem}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {t("operatorMailItem.deleteShipment")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("operatorMailItem.deleteShipmentConfirm")}</AlertDialogTitle>
                <AlertDialogDescription>{t("operatorMailItem.deleteShipmentDesc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteItem} disabled={deletingItem}>
                  {deletingItem ? t("common.deleting") : t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            {!isDestroyed && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t("common.saving") : t("operatorMailItem.saveChanges")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("operatorMailItem.rejectActionConfirm")}</AlertDialogTitle>
          <AlertDialogDescription>{t("operatorMailItem.rejectActionDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t("operatorMailItem.rejectReasonPlaceholder")} rows={3} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleRejectAction} disabled={rejecting || !rejectReason.trim()}>
            {rejecting ? t("operatorMailItem.rejecting") : t("operatorMailItem.rejectAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showOperatorActionConfirm} onOpenChange={setShowOperatorActionConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{operatorActionLabels[operatorAction] ?? t("common.execute")}?</AlertDialogTitle>
          <AlertDialogDescription>{operatorActionDescriptions[operatorAction] ?? t("operatorMailItem.areYouSure")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleOperatorAction} disabled={executingAction}>
            {executingAction ? t("common.executing") : t("common.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
