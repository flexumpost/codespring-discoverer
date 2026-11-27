import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

/** Image that retries a few times when loading fails (e.g. temporary 429). */
export function RetryImg(
  props: React.ImgHTMLAttributes<HTMLImageElement> & { src: string },
) {
  const { src, ...rest } = props;
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
  }, [src]);

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
        if (attempt >= 4) {
          setFailed(true);
          return;
        }
        setTimeout(() => setAttempt((a) => a + 1), 700 * 2 ** attempt + Math.random() * 400);
      }}
    />
  );
}
