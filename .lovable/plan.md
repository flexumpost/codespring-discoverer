
## Fase 4: Notifikationer til lejere

### Formaal
Naar en operatoer registrerer ny post for en lejer, skal lejeren automatisk faa besked. Notifikationerne fungerer paa to niveauer:

1. **In-app notifikationer** -- en notifikationsklokke i lejerens dashboard med ulaeeste beskeder
2. **Email-notifikationer** -- en email sendes til lejerens `contact_email` naar ny post registreres

### Database-aendringer

**Ny tabel: `notifications`**
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL) -- modtageren
- `mail_item_id` (uuid, FK til mail_items)
- `title` (text)
- `message` (text)
- `is_read` (boolean, default false)
- `created_at` (timestamptz)

**RLS-policies:**
- SELECT: `user_id = auth.uid()`
- UPDATE: `user_id = auth.uid()` (markere som laest)
- Operatoerer kan ikke laese andres notifikationer

**Database-trigger paa `mail_items` INSERT:**
En trigger-funktion der automatisk opretter en notifikation naar en ny mail_item indsaettes med en `tenant_id` der har en `user_id` koblet.

### Email-notifikationer

**Ny edge function: `notify-tenant`**
- Kaldet fra database-triggeren via `pg_net` (HTTP extension) eller direkte fra frontend efter succesfuld post-registrering
- Sender email via Lovable AI gateway eller en simpel webhook
- Indhold: "Ny forsendelse modtaget" med type og forsendelsesnr.

Da email-afsendelse kraever opsaetning af en email-tjeneste, starter vi med en enklere tilgang: **edge function kaldet fra frontend** efter registrering, som logger notifikationen. Email kan tilfojes senere naar en email-connector er sat op.

### Frontend-aendringer

**1. Notifikationsklokke-komponent (`NotificationBell.tsx`)**
- Vises i AppSidebar/header for lejer-brugere
- Viser antal ulaeeste notifikationer som badge
- Dropdown med seneste notifikationer
- Klik markerer som laest

**2. Notifikationsside (`/notifications`)**
- Liste over alle notifikationer med laest/ulaest status
- Mulighed for at markere alle som laeeste

**3. Opdatering af `RegisterMailDialog.tsx`**
- Efter succesfuld registrering: opret notifikation i databasen
- Alternativt haandteres dette af database-triggeren automatisk

**4. Realtime-opdatering**
- Aktivér realtime paa `notifications`-tabellen
- Lejerens klokke opdateres live naar ny post registreres

### Implementeringsraekkefoelge

1. Opret `notifications`-tabel med RLS og trigger (migration)
2. Aktivér realtime paa tabellen
3. Opret `NotificationBell.tsx` komponent
4. Tilfoej klokken i sidebar/layout for lejere
5. Opret notifikationsside med route
6. Test end-to-end: registrer post som operatoer, verificer at lejer ser notifikation

### Tekniske detaljer

**Migration SQL:**
```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mail_item_id uuid REFERENCES public.mail_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System inserts notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Trigger: opret notifikation ved ny post
CREATE OR REPLACE FUNCTION public.notify_tenant_on_mail()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _company text;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id, company_name INTO _user_id, _company
  FROM tenants WHERE id = NEW.tenant_id;

  IF _user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, mail_item_id, title, message)
    VALUES (
      _user_id,
      NEW.id,
      'Ny ' || CASE WHEN NEW.mail_type = 'pakke' THEN 'pakke' ELSE 'forsendelse' END || ' modtaget',
      'Der er registreret en ny ' || CASE WHEN NEW.mail_type = 'pakke' THEN 'pakke' ELSE 'forsendelse' END ||
      CASE WHEN NEW.stamp_number IS NOT NULL THEN ' (nr. ' || NEW.stamp_number || ')' ELSE '' END || '.'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_mail_item_created_notify
  AFTER INSERT ON public.mail_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tenant_on_mail();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

**Filer der oprettes/aendres:**
- `src/components/NotificationBell.tsx` -- klokke med dropdown
- `src/pages/NotificationsPage.tsx` -- fuld notifikationsliste
- `src/App.tsx` -- ny route `/notifications`
- `src/components/AppSidebar.tsx` -- tilfoej klokke for lejere
