
ALTER TABLE public.mail_items ADD COLUMN pickup_date timestamptz;
ALTER TABLE public.mail_items ADD COLUMN note_read boolean NOT NULL DEFAULT true;

-- Migrate existing PICKUP data from notes to pickup_date
UPDATE public.mail_items
  SET pickup_date = (regexp_replace(notes, '^PICKUP:', ''))::timestamptz,
      notes = NULL
  WHERE notes LIKE 'PICKUP:%';
