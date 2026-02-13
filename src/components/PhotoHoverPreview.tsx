import { ImageIcon } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface PhotoHoverPreviewProps {
  photoUrl: string | null;
}

export const PhotoHoverPreview = ({ photoUrl }: PhotoHoverPreviewProps) => {
  if (!photoUrl) {
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
          src={photoUrl}
          alt="Foto"
          className="h-10 w-10 rounded object-cover cursor-zoom-in"
        />
      </HoverCardTrigger>
      <HoverCardContent className="w-[600px] p-2" side="right" align="start">
        <img
          src={photoUrl}
          alt="Foto stor"
          className="w-full h-auto rounded-lg shadow-lg"
        />
      </HoverCardContent>
    </HoverCard>
  );
};
