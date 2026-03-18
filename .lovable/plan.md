

## Plan: Tilføj "Login Log" tab til operatør-indstillinger

### Oversigt
Tilføj en ny `login_logs` tabel til at tracke bruger-login-sessioner, og vis dem i en ny "Login Log" fane under operatør-indstillinger. Sessionsvarighed trackes ved at logge login-tidspunkt og opdatere `last_seen_at` periodisk (heartbeat).

### Ændringer

**1. Database migration: `login_logs` tabel**
```sql
CREATE TABLE public.login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert/update (via edge function)
CREATE POLICY "Service role manages login_logs" ON public.login_logs
  FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Operators can read
CREATE POLICY "Operators read login_logs" ON public.login_logs
  FOR SELECT TO authenticated USING (public.is_operator());
```

**2. Edge function: `supabase/functions/log-login/index.ts`**
- Accepts `{ action: "login" | "heartbeat", session_id?: string }`
- On `login`: inserts a new row, returns its `id`
- On `heartbeat`: updates `last_seen_at` for the given session id
- Uses service role for insert/update

**3. Frontend: Track login and heartbeat in `useAuth.tsx`**
- On `SIGNED_IN` event: call `log-login` with `action: "login"`, store returned session id
- Set up a 60-second interval heartbeat that calls `log-login` with `action: "heartbeat"` and the session id
- Clean up interval on sign out or unmount

**4. Ny komponent: `src/components/LoginLogTab.tsx`**
- Similar structure to `EmailLogTab` — table with pagination and search
- Columns: Dato, Bruger (email), Varighed (calculated from `last_seen_at - logged_in_at`)
- Sorted by `logged_in_at DESC`
- Reads directly from `login_logs` table (operators have SELECT access via RLS)
- Search on email

**5. Opdater `OperatorSettingsTabs.tsx`**
- Add "Login Log" tab after "Email Log"

### Filer der oprettes/ændres
- Database migration (new `login_logs` table)
- `supabase/functions/log-login/index.ts` — new
- `src/hooks/useAuth.tsx` — add login tracking + heartbeat
- `src/components/LoginLogTab.tsx` — new
- `src/components/OperatorSettingsTabs.tsx` — add tab

