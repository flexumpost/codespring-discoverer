import { ImageIcon } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PhotoHoverPreviewProps {
  photoUrl: string | null;
}

// Shared cache + limited concurrency so long lists don't trigger storage rate limits (429).
const CACHE_TTL_MS = 50 * 60 * 1000; // signed URLs live 60 min
const urlCache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();
const MAX_CONCURRENT = 4;
let active = 0;
const queue: Array<() => void> = [];

function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      fn().then(resolve, reject).finally(() => {
        active--;
        queue.shift()?.();
      });
    };
    if (active < MAX_CONCURRENT) run(); else queue.push(run);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toPath(photoUrl: string): string | null {
  if (!photoUrl.startsWith("http")) return photoUrl;
  const marker = "/mail-photos/";
  const idx = photoUrl.indexOf(marker);
  return idx === -1 ? null : photoUrl.substring(idx + marker.length).split("?")[0];
}

function getSignedUrl(path: string): Promise<string | null> {
  const cached = urlCache.get(path);
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.url);
  const existing = inflight.get(path);
  if (existing) return existing;
  const p = withSlot(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data } = await supabase.storage.from("mail-photos").createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        urlCache.set(path, { url: data.signedUrl, expires: Date.now() + CACHE_TTL_MS });
        return data.signedUrl;
      }
      await sleep(500 * 2 ** attempt);
    }
    return null;
  }).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

/**
 * Resolves a photo_url value to a displayable signed URL.
 * Handles both legacy full URLs and new path-only values.
 */
function useSignedPhotoUrl(photoUrl: string | null) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!photoUrl) return null;
    const path = toPath(photoUrl);
    if (!path) return photoUrl;
    const c = urlCache.get(path);
    return c && c.expires > Date.now() ? c.url : null;
  });

  useEffect(() => {
    if (!photoUrl) { setUrl(null); return; }
    const path = toPath(photoUrl);
    if (!path) { setUrl(photoUrl); return; }
    let cancelled = false;
    getSignedUrl(path).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [photoUrl]);

  return url;
}

export { useSignedPhotoUrl };

/** Image that retries a few times when loading fails (e.g. temporary 429). */
function RetryImg(props: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const { src, ...rest } = props;
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setAttempt(0); setFailed(false); }, [src]);
  if (failed) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  const finalSrc = attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}r=${attempt}`;
  return (
    <img
      {...rest}
      src={finalSrc}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (attempt >= 4) { setFailed(true); return; }
        setTimeout(() => setAttempt((a) => a + 1), 700 * 2 ** attempt + Math.random() * 400);
      }}
    />
  );
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
