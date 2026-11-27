import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const state = vi.hoisted(() => ({
  calls: [] as Array<{ bucket: string; path: string }>,
  url: 'https://example.test/mail-scans/scan-1.png?sig=1',
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string) => {
          state.calls.push({ bucket, path });
          return { data: { signedUrl: state.url }, error: null };
        },
      }),
    },
  },
}));

import { ScanThumbnail } from '@/components/ScanThumbnail';

beforeEach(() => {
  state.calls = [];
});

describe('scan thumbnail', () => {
  it('shows the scanned image once its access address is ready', async () => {
    render(<ScanThumbnail scanUrl="scan-1.png" />);
    const img = await waitFor(() => screen.getByAltText('Scan'));
    expect(img.getAttribute('src')).toBe(state.url);
    expect(state.calls).toEqual([{ bucket: 'mail-scans', path: 'scan-1.png' }]);
  });

  it('never asks the storage API for a pdf scan', async () => {
    render(<ScanThumbnail scanUrl="scan-2.pdf" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(state.calls).toHaveLength(0);
  });
});
