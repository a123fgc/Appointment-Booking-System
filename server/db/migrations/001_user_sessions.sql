-- Session records used by JWT authentication and server-side revocation.
-- This migration is safe to re-run and does not remove existing data.
CREATE TABLE IF NOT EXISTS public.user_sessions (
  session_id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL
    REFERENCES public.users (id) ON DELETE CASCADE,
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS user_sessions_active_user_idx
  ON public.user_sessions (user_id)
  WHERE revoked_at IS NULL;
