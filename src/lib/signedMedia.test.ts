import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  calls: [] as Array<{ bucket: string; path: string; ttl: number }>,
  inFlight: 0,
  maxInFlight: 0,
  failFirstFor: null as string | null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, ttl: number) => {
          state.calls.push({ bucket, path, ttl });
          state.inFlight += 1;
          state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
          await new Promise((r) => setTimeout(r, 5));
          state.inFlight -= 1;
          const firstAttemptForPath =
            state.failFirstFor === path &&
            state.calls.filter((c) => c.path === path).length === 1;
          if (firstAttemptForPath) return { data: null, error: { message: '429 Too Many Requests' } };
          return { data: { signedUrl: `https://example.test/${bucket}/${path}?sig=1` }, error: null };
        },
      }),
    },
  },
}));

import { getSignedStorageUrl, toStoragePath, MAX_CONCURRENT } from '@/lib/signedMedia';

beforeEach(() => {
  state.calls = [];
  state.inFlight = 0;
  state.maxInFlight = 0;
  state.failFirstFor = null;
});

describe('storage media signed urls', () => {
  it('reads a path out of a legacy full storage URL', () => {
    expect(
      toStoragePath('https://x.supabase.co/storage/v1/object/sign/mail-scans/a/b.pdf?token=t', 'mail-scans'),
    ).toBe('a/b.pdf');
  });

  it('keeps a path-only value unchanged', () => {
    expect(toStoragePath('a/b.pdf', 'mail-scans')).toBe('a/b.pdf');
  });

  it('refuses a URL that points at another bucket', () => {
    expect(toStoragePath('https://x.supabase.co/storage/v1/object/public/other/a.png', 'mail-scans')).toBeNull();
  });

  it('asks the storage API once for the same path requested at the same time', async () => {
    const [first, second] = await Promise.all([
      getSignedStorageUrl('mail-scans', 'dedupe.pdf'),
      getSignedStorageUrl('mail-scans', 'dedupe.pdf'),
    ]);
    expect(first).toBe('https://example.test/mail-scans/dedupe.pdf?sig=1');
    expect(second).toBe(first);
    expect(state.calls.filter((c) => c.path === 'dedupe.pdf')).toHaveLength(1);

    await getSignedStorageUrl('mail-scans', 'dedupe.pdf');
    expect(state.calls.filter((c) => c.path === 'dedupe.pdf')).toHaveLength(1);
  });

  it('never runs more signed-url requests in parallel than the limit', async () => {
    const paths = Array.from({ length: MAX_CONCURRENT * 2 }, (_, i) => `bulk-${i}.pdf`);
    const urls = await Promise.all(paths.map((p) => getSignedStorageUrl('mail-scans', p)));
    expect(urls.every((u) => u?.includes('sig=1'))).toBe(true);
    expect(state.maxInFlight).toBe(MAX_CONCURRENT);
    expect(state.calls).toHaveLength(paths.length);
  });

  it('retries automatically when the storage API answers with an error', async () => {
    state.failFirstFor = 'flaky.pdf';
    const url = await getSignedStorageUrl('mail-scans', 'flaky.pdf');
    expect(url).toBe('https://example.test/mail-scans/flaky.pdf?sig=1');
    expect(state.calls.filter((c) => c.path === 'flaky.pdf')).toHaveLength(2);
  });
});
