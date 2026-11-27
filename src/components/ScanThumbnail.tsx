import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryImg } from "@/components/RetryImg";
import { useInViewOnce, useSignedStorageUrl } from "@/lib/signedMedia";

interface ScanThumbnailProps {
  scanUrl: string;
}

const MAIL_SCANS_BUCKET = "mail-scans";

export function ScanThumbnail({ scanUrl }: ScanThumbnailProps) {
  const [ref, inView] = useInViewOnce<HTMLSpanElement>();
  const isPdf = scanUrl.toLowerCase().endsWith(".pdf");
  const { url, loading } = useSignedStorageUrl(MAIL_SCANS_BUCKET, scanUrl, {
    enabled: inView && !isPdf,
  });

  const pending = !isPdf && !url && (!inView || loading);

  return (
    <span ref={ref} className="inline-block">
      {isPdf ? (
        <span className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </span>
      ) : pending ? (
        <Skeleton className="h-10 w-10 rounded" />
      ) : url ? (
        <RetryImg
          src={url}
          alt="Scan"
          className="h-10 w-10 rounded object-cover border border-border"
        />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </span>
      )}
    </span>
  );
}
