import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ScanUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mailItemId: string;
  tenantId: string;
  onUploaded: () => void;
}

export async function uploadScanFile(file: File, mailItemId: string, tenantId: string) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["pdf", "png", "jpg", "jpeg"].includes(ext)) {
    throw new Error("Kun PDF, PNG og JPG filer er tilladt");
  }
  const path = `${tenantId}/${mailItemId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("mail-scans")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { error: updateError } = await supabase
    .from("mail_items")
    .update({ scan_url: path, status: "ulaest" as any })
    .eq("id", mailItemId);
  if (updateError) throw updateError;
}

export function ScanUploadDialog({ open, onOpenChange, mailItemId, tenantId, onUploaded }: ScanUploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "png", "jpg", "jpeg"].includes(ext)) {
      toast.error("Kun PDF, PNG og JPG filer er tilladt");
      return;
    }
    setUploading(true);
    try {
      await uploadScanFile(file, mailItemId, tenantId);
      setDone(true);
      toast.success("Scanning uploadet");
      onUploaded();
      supabase.functions.invoke("send-new-mail-email", {
        body: { tenant_id: tenantId, mail_type: "scan", template_slug: "new_scan" },
      }).catch((err) => console.error("send scan email failed:", err));
      setTimeout(() => {
        onOpenChange(false);
        setDone(false);
      }, 800);
    } catch (err: any) {
      console.error("Scan upload error:", err);
      toast.error("Kunne ikke uploade scanning");
    } finally {
      setUploading(false);
    }
  }, [mailItemId, tenantId, onUploaded, onOpenChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload scanning</DialogTitle>
        </DialogHeader>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && !done && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
            done
              ? "border-primary bg-primary/5"
              : isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {done ? (
              <CheckCircle2 className="h-7 w-7 text-primary" />
            ) : uploading ? (
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            ) : isDragging ? (
              <ImageIcon className="h-7 w-7 text-primary" />
            ) : (
              <Upload className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {done ? "Upload fuldført!" : uploading ? "Uploader..." : "Træk fil hertil eller klik for at vælge"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepterer PDF, PNG og JPG
            </p>
          </div>
          {!uploading && !done && (
            <Button type="button" variant="outline" size="sm">
              Vælg fil
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
