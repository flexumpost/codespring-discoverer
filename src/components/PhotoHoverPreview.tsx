import { ImageIcon } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { RetryImg } from "@/components/RetryImg";
import { useSignedStorageUrl } from "@/lib/signedMedia";

interface PhotoHoverPreviewProps {
  photoUrl: string | null;
}

const MAIL_PHOTOS_BUCKET = "mail-photos";

/**
 * Resolves a photo_url value to a displayable signed URL.
 * Handles both legacy full URLs and new path-only values.
 */
export function useSignedPhotoUrl(photoUrl: string | null) {
  return useSignedStorageUrl(MAIL_PHOTOS_BUCKET, photoUrl).url;
}

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
        <span className="inline-block">
          <RetryImg
            src={signedUrl}
            alt="Foto"
            className="h-10 w-10 rounded object-cover cursor-zoom-in"
          />
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-[600px] p-2" side="right" align="start">
        <RetryImg
          src={signedUrl}
          alt="Foto stor"
          className="w-full h-auto rounded-lg shadow-lg"
        />
      </HoverCardContent>
    </HoverCard>
  );
};
