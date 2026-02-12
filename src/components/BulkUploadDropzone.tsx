import { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function BulkUploadDropzone({ onFilesSelected, disabled }: BulkUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const images = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      if (images.length > 0) onFilesSelected(images);
    },
    [onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        {isDragging ? (
          <ImageIcon className="h-7 w-7 text-primary" />
        ) : (
          <Upload className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          Træk billeder hertil eller klik for at vælge
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Accepterer JPG, PNG og andre billedformater
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={disabled}>
        Vælg billeder
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
