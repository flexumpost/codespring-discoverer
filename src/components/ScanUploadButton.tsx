import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ScanUploadButtonProps {
  mailItemId: string;
  tenantId: string;
  onUploaded: () => void;
}

export function ScanUploadButton({ mailItemId, tenantId, onUploaded }: ScanUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "png", "jpg", "jpeg"].includes(ext)) {
      toast.error("Kun PDF, PNG og JPG filer er tilladt");
      return;
    }

    setUploading(true);
    try {
      const path = `${tenantId}/${mailItemId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("mail-scans")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the path reference (not a public URL since bucket is private)
      const { error: updateError } = await supabase
        .from("mail_items")
        .update({ scan_url: path } as any)
        .eq("id", mailItemId);

      if (updateError) throw updateError;

      toast.success("Scanning uploadet");
      onUploaded();
    } catch (err: any) {
      console.error("Scan upload error:", err);
      toast.error("Kunne ikke uploade scanning");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        size="sm"
        variant="outline"
        className="gap-1 text-xs h-7"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ScanLine className="h-3 w-3" />
        )}
        Upload scan
      </Button>
    </>
  );
}
