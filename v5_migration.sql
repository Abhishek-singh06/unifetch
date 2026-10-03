-- ============================================================
--  UniFetch V5 Migration: Instant Student Onboarding & ID Submitted Status
-- ============================================================

-- 1. Update is_approved_student() helper function
-- Defines whether a student is verified to participate in real financial and delivery transactions.
CREATE OR REPLACE FUNCTION public.is_approved_student()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND verification_status IN ('approved', 'verified')
      AND status <> 'deactivated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update trigger to allow users to set verification_status to 'submitted', 'id_submitted' or 'pending'
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

  -- Regular users may NOT change their role or inflate credits.
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.credits IS DISTINCT FROM OLD.credits THEN
    RAISE EXCEPTION 'Permission denied: role and credits can only be changed by an admin';
  END IF;

  -- Regular users may submit their ID ('submitted' / 'id_submitted') or reset to 'pending'.
  -- Only admins can set 'verified', 'approved', or 'rejected'.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NEW.verification_status NOT IN ('pending', 'submitted', 'id_submitted') THEN
    RAISE EXCEPTION 'Permission denied: only an admin can verify or reject a student ID';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Storage bucket update policy for student-ids (ensures safe upserts for user's own file)
DROP POLICY IF EXISTS "Students can update their own student ID" ON storage.objects;
CREATE POLICY "Students can update their own student ID"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'student-ids' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
