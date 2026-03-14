import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { ScanUploadDialog } from "@/components/ScanUploadDialog";

interface ScanUploadButtonProps {
  mailItemId: string;
  tenantId: string;
  onUploaded: () => void;
}

export function ScanUploadButton({ mailItemId, tenantId, onUploaded }: ScanUploadButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 text-xs h-7"
        onClick={() => setDialogOpen(true)}
      >
        <ScanLine className="h-3 w-3" />
        Upload scan
      </Button>
      <ScanUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mailItemId={mailItemId}
        tenantId={tenantId}
        onUploaded={onUploaded}
      />
    </>
  );
}
