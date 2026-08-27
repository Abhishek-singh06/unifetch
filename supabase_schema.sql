-- ==============================================================================
-- UniFetch Database Schema & Supabase Setup (Safe Migration)
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. PROFILES TABLE (Create or Upgrade)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  college TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  college_id_url TEXT DEFAULT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist even if the table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_id_url TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Helper function to check if current user is an admin without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view and update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- CRITICAL: the self-update policy above would otherwise let ANY user flip
-- their own verification_status to 'approved' (or grant themselves admin,
-- or inflate credits) with a single PATCH. This trigger locks the
-- privileged columns: they may only change via an admin session, the
-- SQL editor / service role (auth.uid() IS NULL), OR the
-- verify_package_otp RPC (which awards carrier credits via a session var).
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Server-side contexts (SQL editor, service role) are trusted
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins may modify anything
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- System-initiated credit payout from verify_package_otp RPC
  IF current_setting('unifetch.allow_credit_payout', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Regular users may NOT approve themselves, change their role, or inflate credits.
  -- They MAY reset their own status to 'pending' (re-submitting a rejected ID).
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.credits IS DISTINCT FROM OLD.credits THEN
    RAISE EXCEPTION 'Permission denied: role and credits can only be changed by an admin';
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NEW.verification_status <> 'pending' THEN
    RAISE EXCEPTION 'Permission denied: only an admin can approve or reject a verification';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns_trg ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- Trigger to automatically create a profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, college, email, verification_status, role, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'college', ''),
    NEW.email,
    'pending',
    'student',
    100
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    college = EXCLUDED.college,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 3. PACKAGE REQUESTS TABLE (Create or Upgrade)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_description TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  pickup_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist even if table already existed
ALTER TABLE public.package_requests ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.package_requests ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.package_requests ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.package_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- SECURITY: pickup_otp must NEVER live on package_requests — that table is
-- readable by all authenticated users so carriers can browse open jobs.
-- OTPs live in a private table only reachable via security-definer RPCs.
CREATE TABLE IF NOT EXISTS public.request_otps (
  request_id UUID PRIMARY KEY REFERENCES public.package_requests(id) ON DELETE CASCADE,
  otp VARCHAR(6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.request_otps ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: nobody reads/writes request_otps directly.
-- Access happens exclusively through verify_package_otp / get_my_request_otp.

-- Legacy cleanup: drop the old column if it exists (it leaked OTPs to everyone)
ALTER TABLE public.package_requests DROP COLUMN IF EXISTS pickup_otp;

-- Enable RLS on package_requests
ALTER TABLE public.package_requests ENABLE ROW LEVEL SECURITY;

-- Package Requests Policies
-- NOTE: there is deliberately NO policy exposing pending rows' sensitive data.
-- All users see pending rows (needed by /carry), but the OTP is not on this
-- table anymore, so exposing these rows is safe.
DROP POLICY IF EXISTS "Requesters can view their own requests" ON public.package_requests;
CREATE POLICY "Requesters can view their own requests"
  ON public.package_requests FOR SELECT
  USING (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Verified users can view pending requests" ON public.package_requests;
CREATE POLICY "Verified users can view pending requests"
  ON public.package_requests FOR SELECT
  USING (status = 'pending');

DROP POLICY IF EXISTS "Carriers can view their claimed deliveries" ON public.package_requests;
CREATE POLICY "Carriers can view their claimed deliveries"
  ON public.package_requests FOR SELECT
  USING (auth.uid() = carrier_id);

DROP POLICY IF EXISTS "Authenticated users can create requests" ON public.package_requests;
CREATE POLICY "Authenticated users can create requests"
  ON public.package_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Carriers can claim pending requests" ON public.package_requests;
CREATE POLICY "Carriers can claim pending requests"
  ON public.package_requests FOR UPDATE
  USING (
    status = 'pending' AND carrier_id IS NULL
  )
  WITH CHECK (
    auth.uid() = carrier_id AND status = 'matched'
  );

DROP POLICY IF EXISTS "Carriers and Requesters can update their requests" ON public.package_requests;
CREATE POLICY "Carriers and Requesters can update their requests"
  ON public.package_requests FOR UPDATE
  USING (
    auth.uid() = requester_id OR auth.uid() = carrier_id
  );

DROP POLICY IF EXISTS "Requesters can cancel pending requests" ON public.package_requests;
CREATE POLICY "Requesters can cancel pending requests"
  ON public.package_requests FOR DELETE
  USING (
    auth.uid() = requester_id AND status = 'pending'
  );


-- ------------------------------------------------------------------------------
-- 3b. REQUEST CREATION RPC (server generates the OTP so it never round-trips)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_package_request(
  p_package_description TEXT,
  p_pickup_location TEXT,
  p_delivery_location TEXT,
  p_pickup_time TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_new_otp TEXT;
BEGIN
  -- Must be a logged-in user (SECURITY DEFINER bypasses RLS, so verify manually)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Server-side enforcement: only approved students may create requests
  IF NOT public.is_approved_student() THEN
    RAISE EXCEPTION 'User not approved for package requests';
  END IF;

  -- Basic server-side validation
  IF p_package_description IS NULL OR length(trim(p_package_description)) = 0 THEN
    RAISE EXCEPTION 'Package description is required';
  END IF;

  -- Cryptographic 6-digit OTP (client Math.random() was not crypto-safe)
  v_new_otp := lpad((floor(random() * 1000000))::int::text, 6, '0');

  INSERT INTO public.package_requests (
    requester_id, package_description, pickup_location,
    delivery_location, pickup_time, status
  ) VALUES (
    auth.uid(), left(trim(p_package_description), 500), p_pickup_location,
    p_delivery_location, p_pickup_time, 'pending'
  ) RETURNING id INTO v_request_id;

  INSERT INTO public.request_otps (request_id, otp)
  VALUES (v_request_id, v_new_otp);

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3b-2. ATOMIC CLAIM RPC
-- Fixes the two-carrier race: a plain conditional UPDATE "succeeds" even when
-- zero rows matched, letting the 2nd carrier silently steal the job.
-- This claims the row inside one atomic statement and reports real success.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_package_request(
  p_request_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated UUID;
BEGIN
  -- Must be a logged-in user (SECURITY DEFINER bypasses RLS, so verify manually)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Server-side enforcement: only approved students may claim requests
  IF NOT public.is_approved_student() THEN
    RAISE EXCEPTION 'User not approved for package requests';
  END IF;

  UPDATE public.package_requests
  SET carrier_id = auth.uid(), status = 'matched', updated_at = NOW()
  WHERE id = p_request_id
    AND status = 'pending'
    AND carrier_id IS NULL
  RETURNING id INTO v_updated;

  RETURN v_updated IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3c. REALTIME: let postgres_changes subscriptions actually fire
-- (Supabase only streams tables added to the supabase_realtime publication)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'package_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.package_requests;
  END IF;
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. OTP VERIFICATION RPC FUNCTIONS
-- ------------------------------------------------------------------------------

-- Requester-only: reveal MY OWN OTP for MY OWN request (used by /requests page)
CREATE OR REPLACE FUNCTION public.get_my_request_otp(
  p_request_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_otp TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ro.otp INTO v_otp
  FROM public.request_otps ro
  JOIN public.package_requests pr ON pr.id = ro.request_id
  WHERE ro.request_id = p_request_id AND pr.requester_id = auth.uid();

  RETURN v_otp;  -- NULL if not found or not owned by caller
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Carrier submits the OTP: validates + marks delivered + pays out credits atomically
CREATE OR REPLACE FUNCTION public.verify_package_otp(
  p_request_id UUID,
  p_otp TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_stored_otp TEXT;
  v_carrier_id UUID;
  v_status TEXT;
  v_requester_id UUID;
BEGIN
  -- Must be a logged-in user (SECURITY DEFINER bypasses RLS, so verify manually)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Server-side enforcement: only approved students may verify OTPs
  IF NOT public.is_approved_student() THEN
    RAISE EXCEPTION 'User not approved for package requests';
  END IF;

  -- Get request details
  SELECT pr.carrier_id, pr.status, pr.requester_id, ro.otp
  INTO v_carrier_id, v_status, v_requester_id, v_stored_otp
  FROM public.package_requests pr
  LEFT JOIN public.request_otps ro ON ro.request_id = pr.id
  WHERE pr.id = p_request_id;

  -- Validate request exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Ensure caller is the assigned carrier
  IF v_carrier_id IS DISTINCT FROM auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Ensure request is currently matched/in progress
  IF v_status <> 'matched' THEN
    RETURN FALSE;
  END IF;

  -- Compare OTP
  IF v_stored_otp IS NOT NULL AND v_stored_otp = p_otp THEN
    UPDATE public.package_requests
    SET
      status = 'delivered',
      otp_verified = TRUE,
      delivered_at = NOW(),
      updated_at = NOW()
    WHERE id = p_request_id;

    -- Pay the carrier their reward credits (README promises +35 per run)
    -- Use session var to bypass trigger; reset immediately after
    PERFORM set_config('unifetch.allow_credit_payout', 'true', false);
    UPDATE public.profiles
    SET credits = credits + 35, updated_at = NOW()
    WHERE id = v_carrier_id;
    PERFORM set_config('unifetch.allow_credit_payout', 'false', false);

    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 5. STORAGE BUCKET POLICIES FOR 'student-ids' (PRIVATE bucket)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-ids', 'student-ids', false)
ON CONFLICT (id) DO NOTHING;

-- Clean up old bucket policies if they exist
DROP POLICY IF EXISTS "Students can upload their own college ID" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own college ID" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all college IDs" ON storage.objects;

-- New policies for student-ids bucket
CREATE POLICY "Students can upload their own student ID"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-ids' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Students can view their own student ID"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student-ids' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all student IDs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student-ids' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------------------------
-- 6. MIGRATE LEGACY STATUS VALUES ('verified' -> 'approved')
-- ------------------------------------------------------------------------------
UPDATE public.profiles SET verification_status = 'approved'
WHERE verification_status = 'verified';

-- ------------------------------------------------------------------------------
-- 7. SERVER-SIDE ENFORCEMENT: only approved users touch package_requests
-- (Client-side guards are not enough — RLS is the real gate.)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_approved_student()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND verification_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tighten SELECT policies on package_requests: only approved students may browse
DROP POLICY IF EXISTS "Verified users can view pending requests" ON public.package_requests;
CREATE POLICY "Approved users can view pending requests"
  ON public.package_requests FOR SELECT
  USING (public.is_approved_student());

-- Tighten INSERT policy: only approved students may post requests
DROP POLICY IF EXISTS "Authenticated users can create requests" ON public.package_requests;
CREATE POLICY "Approved users can create requests"
  SECURITY DEFINER
  ON public.package_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id AND public.is_approved_student());

-- Tighten claim policy: only approved carriers
DROP POLICY IF EXISTS "Carriers can claim pending requests" ON public.package_requests;
CREATE POLICY "Approved carriers can claim pending requests"
  ON public.package_requests FOR UPDATE
  USING (
    status = 'pending' AND carrier_id IS NULL AND public.is_approved_student()
  )
  WITH CHECK (
    auth.uid() = carrier_id AND status = 'matched'
  );
