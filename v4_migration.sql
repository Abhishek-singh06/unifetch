-- ============================================================
--  UniFetch V4 Migration: Safety, Moderation, Blocks & Deactivation
-- ============================================================

-- ------------------------------------------------------------
-- 1. REPORTS TABLE & RLS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id UUID DEFAULT NULL, -- optional request reference
  reason TEXT NOT NULL, -- e.g. 'payment_issue', 'harassment', etc.
  description TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_report CHECK (reporter_id <> reported_user_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own submitted reports" ON public.reports;
CREATE POLICY "Users can read their own submitted reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can view and manage all reports" ON public.reports;
CREATE POLICY "Admins can view and manage all reports"
  ON public.reports FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
CREATE POLICY "Users can insert their own reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ------------------------------------------------------------
-- 2. BLOCKS TABLE & RLS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocks" ON public.blocks;
CREATE POLICY "Users can view their own blocks"
  ON public.blocks FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can block others" ON public.blocks;
CREATE POLICY "Users can block others"
  ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock others" ON public.blocks;
CREATE POLICY "Users can unblock others"
  ON public.blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- ------------------------------------------------------------
-- 3. PROFILE DEACTIVATION SYSTEM (DELETION REQUEST / DEACTIVATION)
-- ------------------------------------------------------------

-- Add status column to profiles to handle deactivation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated'));

-- Add a trigger to prevent logging in or performing actions if deactivated
CREATE OR REPLACE FUNCTION public.check_user_status()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'deactivated'
  ) THEN
    RAISE EXCEPTION 'This account has been deactivated.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger check on package requests creation
DROP TRIGGER IF EXISTS trg_check_status_package_requests ON public.package_requests;
CREATE TRIGGER trg_check_status_package_requests
  BEFORE INSERT ON public.package_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();

-- Trigger check on outside requests creation
DROP TRIGGER IF EXISTS trg_check_status_outside_requests ON public.outside_requests;
CREATE TRIGGER trg_check_status_outside_requests
  BEFORE INSERT ON public.outside_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();
