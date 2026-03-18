import { ImageIcon } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PhotoHoverPreviewProps {
  photoUrl: string | null;
}

/**
 * Resolves a photo_url value to a displayable signed URL.
 * Handles both legacy full URLs and new path-only values.
 */
function useSignedPhotoUrl(photoUrl: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoUrl) { setUrl(null); return; }

    // Legacy full URL — still works if bucket was once public
    if (photoUrl.startsWith("http")) {
      // Extract storage path from full URL
      const marker = "/mail-photos/";
      const idx = photoUrl.indexOf(marker);
      if (idx === -1) { setUrl(photoUrl); return; }
      const path = photoUrl.substring(idx + marker.length);
      supabase.storage.from("mail-photos").createSignedUrl(path, 3600)
        .then(({ data }) => setUrl(data?.signedUrl ?? null));
      return;
    }

    // New path-only value
    supabase.storage.from("mail-photos").createSignedUrl(photoUrl, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [photoUrl]);

  return url;
}

export { useSignedPhotoUrl };

export const PhotoHoverPreview = ({ photoUrl }: PhotoHoverPreviewProps) => {
  const signedUrl = useSignedPhotoUrl(photoUrl);

  if (!signedUrl) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <img
          src={signedUrl}
          alt="Foto"
          className="h-10 w-10 rounded object-cover cursor-zoom-in"
        />
      </HoverCardTrigger>
      <HoverCardContent className="w-[600px] p-2" side="right" align="start">
        <img
          src={signedUrl}
          alt="Foto stor"
          className="w-full h-auto rounded-lg shadow-lg"
        />
      </HoverCardContent>
    </HoverCard>
  );
};
