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
  college_id_url TEXT DEFAULT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist even if the table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college TEXT NOT NULL DEFAULT '';
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

-- Trigger to automatically create a profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, college, verification_status, role, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'college', ''),
    'pending',
    'student',
    100
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    college = EXCLUDED.college;
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
  pickup_otp VARCHAR(6) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist even if table already existed
ALTER TABLE public.package_requests ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.package_requests ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(6);
ALTER TABLE public.package_requests ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.package_requests ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.package_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Enable RLS on package_requests
ALTER TABLE public.package_requests ENABLE ROW LEVEL SECURITY;

-- Package Requests Policies
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
-- 4. OTP VERIFICATION RPC FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_package_otp(
  p_request_id UUID,
  p_otp TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_stored_otp TEXT;
  v_carrier_id UUID;
  v_status TEXT;
BEGIN
  -- Get request details
  SELECT pickup_otp, carrier_id, status
  INTO v_stored_otp, v_carrier_id, v_status
  FROM public.package_requests
  WHERE id = p_request_id;

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
  IF v_stored_otp = p_otp THEN
    UPDATE public.package_requests
    SET
      status = 'delivered',
      otp_verified = TRUE,
      delivered_at = NOW(),
      updated_at = NOW()
    WHERE id = p_request_id;

    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 5. STORAGE BUCKET POLICIES FOR 'college-ids'
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('college-ids', 'college-ids', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Students can upload their own college ID" ON storage.objects;
CREATE POLICY "Students can upload their own college ID"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'college-ids' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Students can view their own college ID" ON storage.objects;
CREATE POLICY "Students can view their own college ID"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'college-ids' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Admins can view all college IDs" ON storage.objects;
CREATE POLICY "Admins can view all college IDs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'college-ids' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
