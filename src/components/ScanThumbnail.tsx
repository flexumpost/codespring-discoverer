import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ScanThumbnailProps {
  scanUrl: string;
}

export function ScanThumbnail({ scanUrl }: ScanThumbnailProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isPdf = scanUrl.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let cancelled = false;

    const fetchUrl = async () => {
      const { data, error } = await supabase.storage
        .from("mail-scans")
        .createSignedUrl(scanUrl, 300);

      if (!cancelled) {
        if (!error && data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
        setLoading(false);
      }
    };

    fetchUrl();
    return () => { cancelled = true; };
  }, [scanUrl]);

  if (loading) {
    return <Skeleton className="h-10 w-10 rounded" />;
  }

  if (isPdf) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>
    );
  }

  return signedUrl ? (
    <img
      src={signedUrl}
      alt="Scan"
      className="h-10 w-10 rounded object-cover border border-border"
    />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
      <FileText className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}
