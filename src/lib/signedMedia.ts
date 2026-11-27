import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared storage-media helper.
 *
 * Long mail lists used to ask for one signed URL per row at the same instant,
 * which the storage API answered with HTTP 429 and the UI showed as broken
 * images. Signed URL creation is therefore cached, de-duplicated and run with
 * limited concurrency, with a few automatic retries.
 */

export const MAX_CONCURRENT = 4;
const CACHE_TTL_MS = 50 * 60 * 1000; // signed URLs live 60 min
const RETRY_BASE_MS = 500;
const MAX_ATTEMPTS = 4;

const urlCache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();
const queue: Array<() => void> = [];
let active = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          queue.shift()?.();
        });
    };
    if (active < MAX_CONCURRENT) run();
    else queue.push(run);
  });
}

/**
 * Turns a stored value into a bucket-relative path.
 * Handles both path-only values and legacy full URLs.
 */
export function toStoragePath(urlOrPath: string, bucket: string): string | null {
  if (!urlOrPath.startsWith("http")) return urlOrPath;
  const marker = `/${bucket}/`;
  const idx = urlOrPath.indexOf(marker);
  return idx === -1 ? null : urlOrPath.substring(idx + marker.length).split("?")[0];
}

/** Signed URL for a bucket path, cached and rate-limit friendly. */
export async function getSignedStorageUrl(
  bucket: string,
  path: string,
  ttl = 3600,
): Promise<string | null> {
  const key = `${bucket}/${path}`;
  const cached = urlCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.url;

  const existing = inflight.get(key);
  if (existing) return existing;

  const pending = withSlot(async () => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
      if (data?.signedUrl) {
        urlCache.set(key, { url: data.signedUrl, expires: Date.now() + CACHE_TTL_MS });
        return data.signedUrl;
      }
      if (attempt < MAX_ATTEMPTS - 1) await sleep(RETRY_BASE_MS * 2 ** attempt);
    }
    return null;
  }).finally(() => inflight.delete(key));

  inflight.set(key, pending);
  return pending;
}

interface SignedUrlOptions {
  /** Keep the request parked until this turns true (e.g. row scrolled into view). */
  enabled?: boolean;
  ttl?: number;
}

/** Resolves a stored path or URL to a displayable signed URL. */
export function useSignedStorageUrl(
  bucket: string,
  urlOrPath: string | null | undefined,
  options: SignedUrlOptions = {},
): { url: string | null; loading: boolean } {
  const { enabled = true, ttl = 3600 } = options;
  const target = enabled ? urlOrPath ?? null : null;
  const path = target ? toStoragePath(target, bucket) : null;

  const [state, setState] = useState<{ url: string | null; loading: boolean }>(() => {
    if (!target) return { url: null, loading: false };
    if (!path) return { url: target, loading: false };
    const cached = urlCache.get(`${bucket}/${path}`);
    return cached && cached.expires > Date.now()
      ? { url: cached.url, loading: false }
      : { url: null, loading: true };
  });

  useEffect(() => {
    if (!target) {
      setState({ url: null, loading: false });
      return;
    }
    if (!path) {
      setState({ url: target, loading: false });
      return;
    }
    const cached = urlCache.get(`${bucket}/${path}`);
    if (cached && cached.expires > Date.now()) {
      setState({ url: cached.url, loading: false });
      return;
    }
    let cancelled = false;
    setState({ url: null, loading: true });
    getSignedStorageUrl(bucket, path, ttl).then((url) => {
      if (!cancelled) setState({ url, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [bucket, target, path, ttl]);

  return state;
}

/**
 * True once the element has been visible on screen. Lets rows skip storage
 * work until the user actually scrolls to them.
 */
export function useInViewOnce<T extends Element>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView] as const;
}
