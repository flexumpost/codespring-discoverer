import { useState } from "react";
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
  const isFinalized = isDestroyed || isPickedUp || isSent || item.status === "arkiveret";
  const [reactivating, setReactivating] = useState(false);

  const handleReactivate = async () => {
    setReactivating(true);
    const { error } = await supabase
      .from("mail_items")
      .update({ status: "afventer_handling" as any, chosen_action: null })
      .eq("id", item.id);
    setReactivating(false);
    if (error) {
      toast.error("Kunne ikke genaktivere forsendelsen");
      console.error(error);
    } else {
      toast.success("Forsendelse genaktiveret");
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
      toast.error("Kunne ikke bekræfte destruktion");
      console.error(error);
    } else {
      toast.success("Forsendelse markeret som destrueret");
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
    // If operator wrote/changed a note, mark as unread for tenant
    if (noteChanged && notes) {
      updateData.note_read = false;
    }
    const { error } = await supabase
      .from("mail_items")
      .update(updateData)
      .eq("id", item.id);

    setSaving(false);
    if (error) {
      toast.error("Kunne ikke gemme ændringer");
      console.error(error);
    } else {
      toast.success("Ændringer gemt");
      onSaved();
      onOpenChange(false);
    }
  };

  const handleDeleteScan = async () => {
    if (!item.scan_url) return;
    setDeletingScan(true);

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from("mail-scans")
      .remove([item.scan_url]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
    }

    // Clear scan_url and scanned_at
    const { error } = await supabase
      .from("mail_items")
      .update({ scan_url: null, scanned_at: null })
      .eq("id", item.id);

    setDeletingScan(false);
    if (error) {
      toast.error("Kunne ikke slette scanningen");
      console.error(error);
    } else {
      toast.success("Scanning slettet");
      onSaved();
      onOpenChange(false);
    }
  };

  const handleDeleteItem = async () => {
    setDeletingItem(true);
    // Delete photo from storage if exists
    if (item.photo_url) {
      let photoPath = item.photo_url;
      // Handle legacy full URLs
      const marker = "/mail-photos/";
      const idx = item.photo_url.indexOf(marker);
      if (idx !== -1) {
        photoPath = item.photo_url.substring(idx + marker.length);
      }
      if (photoPath) {
        await supabase.storage.from("mail-photos").remove([photoPath]);
      }
    }
    // Delete scan from storage if exists
    if (item.scan_url) {
      await supabase.storage.from("mail-scans").remove([item.scan_url]);
    }
    const { error } = await supabase.from("mail_items").delete().eq("id", item.id);
    setDeletingItem(false);
    if (error) {
      toast.error("Kunne ikke slette forsendelsen");
      console.error(error);
    } else {
      toast.success("Forsendelse slettet");
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
      toast.error("Kunne ikke afvise handlingen");
      console.error(error);
    } else {
      toast.success("Handling afvist");
      setShowRejectDialog(false);
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Rediger forsendelse</DialogTitle>
          {isDestroyed && (
            <Badge variant="destructive" className="mt-2">Forsendelse destrueret</Badge>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Photo + Scan preview row */}
          {(item.photo_url || item.scan_url) && (
            <div className="flex items-start gap-4">
              {item.photo_url && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Foto</Label>
                  <PhotoHoverPreview photoUrl={item.photo_url} />
                </div>
              )}
              {item.scan_url && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Scan</Label>
                  <ScanThumbnail scanUrl={item.scan_url} />
                </div>
              )}
            </div>
          )}

          {/* Tenant section */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-muted-foreground">Lejer</Label>
              <p className="text-sm font-medium">
                {item.tenants?.company_name ?? (
                  <span className="text-destructive">Ikke tildelt</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onReassignTenant();
                onOpenChange(false);
              }}
            >
              Skift lejer
            </Button>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stamp">Forsendelsesnr.</Label>
              <Input
                id="stamp"
                value={stampNumber}
                onChange={(e) => setStampNumber(e.target.value)}
                placeholder="Nummer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sender">Afsender</Label>
              <Input
                id="sender"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Afsender"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={mailType} onValueChange={(v) => setMailType(v as Database["public"]["Enums"]["mail_type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brev">Brev</SelectItem>
                <SelectItem value="pakke">Pakke</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Noter</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Skriv noter..."
              rows={3}
            />
          </div>

          {/* Reactivate archived item section */}
          {isArchivedByUser && (
            <div className="flex items-center justify-between rounded-md border border-blue-300 bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Arkiveret af bruger</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={handleReactivate}
                disabled={reactivating}
              >
                {reactivating ? "Genaktiverer..." : "Genaktivér"}
              </Button>
            </div>
          )}

          {/* Confirm destruction section */}
          {isPendingDestruction && (
            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Lejer ønsker forsendelsen destrueret</span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDestruction}
                disabled={confirmingDestruction}
              >
                {confirmingDestruction ? "Bekræfter..." : "Bekræft destruktion"}
              </Button>
            </div>
          )}

          {/* Reject action section */}
          {item.chosen_action && !isPendingDestruction && !isDestroyed && (
            <div className="flex items-center justify-between rounded-md border border-orange-300 bg-orange-50 p-3">
              <div className="flex items-center gap-2">
                <ShieldX className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Ønsket handling: <strong>{item.chosen_action}</strong></span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={() => setShowRejectDialog(true)}
              >
                Afvis handling
              </Button>
            </div>
          )}

          {/* Delete scan section */}
          {item.scan_url && (
            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-destructive" />
                <span className="text-sm">Vedhæftet scanning</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deletingScan}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Slet scan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Slet scanning?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Det scannede dokument vil blive slettet permanent. Denne handling kan ikke fortrydes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuller</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteScan} disabled={deletingScan}>
                      Slet
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
                Slet forsendelse
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Slet forsendelse?</AlertDialogTitle>
                <AlertDialogDescription>
                  Forsendelsen og tilhørende filer vil blive slettet permanent. Denne handling kan ikke fortrydes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuller</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteItem} disabled={deletingItem}>
                  {deletingItem ? "Sletter..." : "Slet"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuller
            </Button>
            {!isDestroyed && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Gemmer..." : "Gem ændringer"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Reject action dialog */}
    <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Afvis handling?</AlertDialogTitle>
          <AlertDialogDescription>
            Angiv en begrundelse for afvisningen. Lejeren vil kunne se denne besked.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Skriv begrundelse for afvisning..."
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuller</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRejectAction}
            disabled={rejecting || !rejectReason.trim()}
          >
            {rejecting ? "Afviser..." : "Afvis handling"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
