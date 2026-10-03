-- ============================================================
--  UniFetch V2 Migration
--  Safe migration: no DROP or TRUNCATE on existing tables.
--  Run this against your Supabase project SQL editor.
--  Created: 2026-08-29
-- ============================================================


-- ============================================================
-- SECTION 0 — PROFILES: new hostel column
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hostel TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.hostel IS
  'Optional hostel / dorm name for the student profile.';


-- ============================================================
-- SECTION 1 — BROADCASTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     UUID        NOT NULL
                               REFERENCES public.profiles(id) ON DELETE CASCADE,
  message        TEXT        NOT NULL
                               CHECK (char_length(message) <= 500),
  destination    TEXT        DEFAULT NULL,
  scheduled_date DATE        DEFAULT NULL,
  scheduled_time TIME        DEFAULT NULL,
  category       TEXT        NOT NULL DEFAULT 'general'
                               CHECK (category IN ('going_out', 'need_help', 'general')),
  status         TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.broadcasts              IS 'Student broadcast messages for going-out, needing help, or general announcements.';
COMMENT ON COLUMN public.broadcasts.message       IS 'Broadcast body text. Max 500 characters.';
COMMENT ON COLUMN public.broadcasts.destination   IS 'Optional destination (e.g. "City Mall") relevant to a going-out broadcast.';
COMMENT ON COLUMN public.broadcasts.scheduled_date IS 'Optional date the student plans to go out / needs help.';
COMMENT ON COLUMN public.broadcasts.scheduled_time IS 'Optional time component for the scheduled activity.';
COMMENT ON COLUMN public.broadcasts.category      IS 'One of: going_out | need_help | general.';
COMMENT ON COLUMN public.broadcasts.status        IS 'One of: active | cancelled. Creators can cancel their own broadcasts.';

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_broadcasts_creator_id
  ON public.broadcasts (creator_id);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status
  ON public.broadcasts (status);

CREATE INDEX IF NOT EXISTS idx_broadcasts_category
  ON public.broadcasts (category);

CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at
  ON public.broadcasts (created_at DESC);

-- ── Auto-update updated_at ──────────────────────────────────
--   Reuse the trigger function if it already exists (common in Supabase projects),
--   otherwise create it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcasts_updated_at ON public.broadcasts;
CREATE TRIGGER trg_broadcasts_updated_at
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read broadcasts
DROP POLICY IF EXISTS "broadcasts_select_authenticated" ON public.broadcasts;
CREATE POLICY "broadcasts_select_authenticated"
  ON public.broadcasts
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: only approved students
DROP POLICY IF EXISTS "broadcasts_insert_approved" ON public.broadcasts;
CREATE POLICY "broadcasts_insert_approved"
  ON public.broadcasts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_approved_student()
  );

-- UPDATE: creator can only update their own broadcast
--         (intended to allow status changes, e.g. cancellation)
DROP POLICY IF EXISTS "broadcasts_update_own" ON public.broadcasts;
CREATE POLICY "broadcasts_update_own"
  ON public.broadcasts
  FOR UPDATE
  TO authenticated
  USING   (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- DELETE: creator can delete their own broadcast
DROP POLICY IF EXISTS "broadcasts_delete_own" ON public.broadcasts;
CREATE POLICY "broadcasts_delete_own"
  ON public.broadcasts
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- ── Realtime ────────────────────────────────────────────────
--   Add broadcasts to the supabase_realtime publication so
--   clients can subscribe to live changes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname   = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'broadcasts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
  END IF;
END;
$$;


-- ============================================================
-- SECTION 2 — REVIEWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id   UUID        NOT NULL
                              REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id   UUID        NOT NULL
                              REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type  TEXT        NOT NULL
                              CHECK (request_type IN ('campus', 'outside')),
  -- request_id intentionally has NO foreign-key constraint because it may
  -- reference either public.package_requests.id or public.outside_requests.id.
  request_id    UUID        NOT NULL,
  rating        INTEGER     NOT NULL
                              CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT        DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent a user from submitting more than one review per task
  CONSTRAINT uq_reviews_reviewer_request
    UNIQUE (reviewer_id, request_id),

  -- Prevent self-reviews at the database level
  CONSTRAINT chk_reviews_no_self_review
    CHECK (reviewer_id <> reviewee_id)
);

COMMENT ON TABLE  public.reviews               IS 'Peer reviews submitted after a campus or outside delivery task is completed.';
COMMENT ON COLUMN public.reviews.request_type  IS 'campus → package_requests; outside → outside_requests.';
COMMENT ON COLUMN public.reviews.request_id    IS 'ID of the related task. No FK enforced because source table varies by request_type.';
COMMENT ON COLUMN public.reviews.rating        IS 'Star rating 1–5 (inclusive).';
COMMENT ON COLUMN public.reviews.comment       IS 'Optional free-text feedback from the reviewer.';

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id
  ON public.reviews (reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id
  ON public.reviews (reviewee_id);

CREATE INDEX IF NOT EXISTS idx_reviews_request_id
  ON public.reviews (request_id);

CREATE INDEX IF NOT EXISTS idx_reviews_request_type
  ON public.reviews (request_type);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user can read reviews
DROP POLICY IF EXISTS "reviews_select_authenticated" ON public.reviews;
CREATE POLICY "reviews_select_authenticated"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: approved students only; reviewer_id must match the caller
DROP POLICY IF EXISTS "reviews_insert_approved" ON public.reviews;
CREATE POLICY "reviews_insert_approved"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_approved_student()
    AND reviewer_id = auth.uid()
  );

-- No UPDATE or DELETE policies: reviews are immutable once submitted.
-- Admins can manage rows directly via the service-role key if needed.

-- ── Realtime ────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname    = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;
END;
$$;


-- ============================================================
-- END OF V2 MIGRATION
-- ============================================================
