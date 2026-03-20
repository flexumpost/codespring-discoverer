CREATE OR REPLACE FUNCTION public.get_login_logs(
  _role text,
  _search text DEFAULT '',
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, user_id uuid, email text,
  logged_in_at timestamptz, last_seen_at timestamptz,
  total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.user_id, l.email, l.logged_in_at, l.last_seen_at,
    COUNT(*) OVER() AS total_count
  FROM login_logs l
  WHERE
    CASE WHEN _role = 'operator'
      THEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = l.user_id AND r.role = 'operator')
      ELSE NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = l.user_id AND r.role = 'operator')
    END
    AND (_search = '' OR l.email ILIKE '%' || _search || '%')
  ORDER BY l.logged_in_at DESC
  LIMIT _limit OFFSET _offset
$$;