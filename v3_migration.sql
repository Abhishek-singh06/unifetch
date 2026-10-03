-- ============================================================
--  UniFetch V3 Migration: Payments & Unified Notification System
-- ============================================================

-- ------------------------------------------------------------
-- 1. PAYMENT SETTINGS TABLE & STORAGE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  upi_id TEXT NOT NULL,
  qr_image_path TEXT DEFAULT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid)
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view payment settings" ON public.payment_settings;
CREATE POLICY "Anyone can view payment settings"
  ON public.payment_settings FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage payment settings" ON public.payment_settings;
CREATE POLICY "Admins can manage payment settings"
  ON public.payment_settings FOR ALL
  USING (public.is_admin());

-- Ensure default single configuration row exists (placeholder)
INSERT INTO public.payment_settings (id, upi_id)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'unifetch@upi')
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for Admin QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-settings', 'payment-settings', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access to Payment Settings Storage" ON storage.objects;
CREATE POLICY "Public Access to Payment Settings Storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-settings');

DROP POLICY IF EXISTS "Admin Manage Payment Settings Storage" ON storage.objects;
CREATE POLICY "Admin Manage Payment Settings Storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'payment-settings' AND (SELECT public.is_admin()));

-- ------------------------------------------------------------
-- 2. UNIFIED NOTIFICATIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT DEFAULT NULL,
  source_type TEXT DEFAULT NULL,
  source_id UUID DEFAULT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_source 
  ON public.notifications(user_id, source_type, source_id);

DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Realtime Enablement ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 3. NOTIFICATION TRIGGER LOGIC
-- ------------------------------------------------------------

-- Function to handle Campus Package Request notifications
CREATE OR REPLACE FUNCTION public.trg_package_request_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_carrier_name TEXT;
  v_requester_name TEXT;
BEGIN
  -- 1. Request Created (Only for requester)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
    VALUES (
      NEW.requester_id,
      'REQUEST_CREATED',
      'Campus Request Created',
      'Your campus request has been created.',
      '/requests',
      'campus_created',
      NEW.id
    ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- 2. Request Claimed / Accepted
    IF OLD.status = 'pending' AND NEW.status = 'matched' AND NEW.carrier_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.requester_id,
        'REQUEST_ACCEPTED',
        'Campus Request Accepted',
        'Someone accepted your campus delivery request.',
        '/requests',
        'campus_accepted',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;

    -- 3. Delivery Handoff OTP Verified / Completed
    IF OLD.status <> 'delivered' AND NEW.status = 'delivered' AND NEW.otp_verified = TRUE THEN
      -- Notify Requester
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.requester_id,
        'TASK_COMPLETED',
        'Campus Delivery Complete',
        'Your campus delivery is complete.',
        '/requests',
        'campus_completed_requester',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;

      -- Notify Carrier
      IF NEW.carrier_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
        VALUES (
          NEW.carrier_id,
          'CARRIER_REWARD',
          'Credits Earned!',
          'You earned 35 Credits.',
          '/carry',
          'campus_completed_carrier',
          NEW.id
        ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_package_request_notifications ON public.package_requests;
CREATE TRIGGER trg_package_request_notifications
  AFTER INSERT OR UPDATE ON public.package_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_package_request_notifications();


-- Function to handle Outside Campus notifications
CREATE OR REPLACE FUNCTION public.trg_outside_request_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_carrier_name TEXT;
  v_requester_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- 1. Carrier claims the request (Open -> Negotiating)
    IF OLD.status = 'OPEN' AND NEW.status = 'NEGOTIATING' AND NEW.carrier_id IS NOT NULL THEN
      SELECT full_name INTO v_carrier_name FROM public.profiles WHERE id = NEW.carrier_id;
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.requester_id,
        'REQUEST_ACCEPTED',
        'Outside Task Claimed',
        COALESCE(v_carrier_name, 'A student') || ' accepted your request.',
        '/outside/' || NEW.id,
        'outside_claimed',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;

    -- 2. Reward agreed / proposal accepted
    IF OLD.status = 'NEGOTIATING' AND NEW.status = 'ACCEPTED' AND NEW.final_reward IS NOT NULL THEN
      -- Notify Carrier
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.carrier_id,
        'REWARD_AGREED',
        'Reward Agreed',
        'Reward agreed: ₹' || NEW.final_reward || '.',
        '/outside/' || NEW.id,
        'outside_agreed_carrier',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;

      -- Notify Requester
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.requester_id,
        'REWARD_AGREED',
        'Reward Agreed',
        'Reward agreed: ₹' || NEW.final_reward || '.',
        '/outside/' || NEW.id,
        'outside_agreed_requester',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;

    -- 3. Payment details (QR) shared
    IF (OLD.payment_qr_url IS NULL OR OLD.payment_qr_url = '') AND NEW.payment_qr_url IS NOT NULL AND NEW.payment_qr_url <> '' THEN
      SELECT full_name INTO v_carrier_name FROM public.profiles WHERE id = NEW.carrier_id;
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.requester_id,
        'PAYMENT_DETAILS_SHARED',
        'Payment Details Shared',
        'Payment details shared by ' || COALESCE(v_carrier_name, 'carrier') || '.',
        '/outside/' || NEW.id,
        'outside_details_shared',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;

    -- 4. Requester marks payment as Sent
    IF OLD.payment_status = 'Pending' AND NEW.payment_status = 'Sent' THEN
      SELECT full_name INTO v_requester_name FROM public.profiles WHERE id = NEW.requester_id;
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.carrier_id,
        'PAYMENT_SENT',
        'Payment Marked Sent',
        'Payment marked as sent. Please verify receipt.',
        '/outside/' || NEW.id,
        'outside_payment_sent',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;

    -- 5. Carrier confirms payment receipt
    IF OLD.payment_status <> 'Confirmed' AND NEW.payment_status = 'Confirmed' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.requester_id,
        'PAYMENT_CONFIRMED',
        'Payment Confirmed',
        'Payment confirmed.',
        '/outside/' || NEW.id,
        'outside_payment_confirmed',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;

    -- 6. Task Starts (In Progress)
    IF OLD.status <> 'IN PROGRESS' AND NEW.status = 'IN PROGRESS' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.requester_id,
        'TASK_IN_PROGRESS',
        'Task In Progress',
        'Your task is now in progress.',
        '/outside/' || NEW.id,
        'outside_in_progress',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;

    -- 7. Task Completed
    IF OLD.status <> 'COMPLETED' AND NEW.status = 'COMPLETED' THEN
      -- Notify Requester
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.requester_id,
        'TASK_COMPLETED',
        'Task Completed',
        'Your task is completed.',
        '/outside/' || NEW.id,
        'outside_completed_requester',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;

      -- Notify Carrier
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.carrier_id,
        'TASK_COMPLETED',
        'Task Completed',
        'Your task is completed.',
        '/outside/' || NEW.id,
        'outside_completed_carrier',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_outside_request_notifications ON public.outside_requests;
CREATE TRIGGER trg_outside_request_notifications
  AFTER UPDATE ON public.outside_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_outside_request_notifications();


-- Function to handle Outside Chat Messages notifications
CREATE OR REPLACE FUNCTION public.trg_outside_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_requester_id UUID;
  v_carrier_id UUID;
  v_sender_name TEXT;
  v_recipient_id UUID;
BEGIN
  -- Only trigger for non-system messages, or proposals
  IF NEW.is_system = FALSE THEN
    SELECT requester_id, carrier_id INTO v_requester_id, v_carrier_id
    FROM public.outside_requests WHERE id = NEW.request_id;

    -- Find the recipient
    IF NEW.sender_id = v_requester_id THEN
      v_recipient_id := v_carrier_id;
    ELSE
      v_recipient_id := v_requester_id;
    END IF;

    IF v_recipient_id IS NOT NULL THEN
      SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

      IF NEW.proposal_amount IS NOT NULL THEN
        -- Proposal notification
        INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
        VALUES (
          v_recipient_id,
          'REWARD_PROPOSAL',
          'New Reward Proposal',
          COALESCE(v_sender_name, 'Student') || ' proposed a cash reward of ₹' || NEW.proposal_amount || '.',
          '/outside/' || NEW.request_id,
          'outside_proposal_' || NEW.id,
          NEW.id
        ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
      ELSE
        -- Standard chat message notification
        INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
        VALUES (
          v_recipient_id,
          'NEW_MESSAGE',
          'New Message',
          COALESCE(v_sender_name, 'Student') || ': ' || substring(NEW.content from 1 for 60),
          '/outside/' || NEW.request_id,
          'outside_msg_' || NEW.id,
          NEW.id
        ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_outside_message_notifications ON public.outside_messages;
CREATE TRIGGER trg_outside_message_notifications
  AFTER INSERT ON public.outside_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_outside_message_notifications();


-- Function to handle Credit Purchase notifications
CREATE OR REPLACE FUNCTION public.trg_credit_purchase_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Purchase Submitted (For the user)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
    VALUES (
      NEW.user_id,
      'CREDIT_PURCHASE_SUBMITTED',
      'Credit Purchase Submitted',
      'Credit purchase submitted.',
      '/credits',
      'credit_submitted',
      NEW.id
    ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- 2. Approved
    IF OLD.status = 'pending' AND NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.user_id,
        'CREDITS_ADDED',
        'Credits Added',
        NEW.credits || ' Credits have been added to your account.',
        '/credits',
        'credit_approved',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;

    -- 3. Rejected
    IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
      VALUES (
        NEW.user_id,
        'CREDIT_PURCHASE_REJECTED',
        'Credit Purchase Rejected',
        'Your Credit purchase was rejected.' || COALESCE(' Reason: ' || NEW.rejection_reason, ''),
        '/credits',
        'credit_rejected',
        NEW.id
      ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_credit_purchase_notifications ON public.credit_purchases;
CREATE TRIGGER trg_credit_purchase_notifications
  AFTER INSERT OR UPDATE ON public.credit_purchases
  FOR EACH ROW EXECUTE FUNCTION public.trg_credit_purchase_notifications();


-- Function to handle Review notifications
CREATE OR REPLACE FUNCTION public.trg_review_notifications()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, source_type, source_id)
  VALUES (
    NEW.reviewee_id,
    'NEW_REVIEW',
    'New Review Received',
    'You received a new review.',
    CASE WHEN NEW.request_type = 'campus' THEN '/requests' ELSE '/outside/' || NEW.request_id END,
    'review_received',
    NEW.id
  ) ON CONFLICT (user_id, source_type, source_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_review_notifications ON public.reviews;
CREATE TRIGGER trg_review_notifications
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_review_notifications();


-- ------------------------------------------------------------
-- 4. SERVER-SIDE NOTIFICATION PREFERENCES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_requests BOOLEAN NOT NULL DEFAULT TRUE,
  email_payments BOOLEAN NOT NULL DEFAULT TRUE,
  email_credits BOOLEAN NOT NULL DEFAULT TRUE,
  email_tasks BOOLEAN NOT NULL DEFAULT TRUE,
  email_messages BOOLEAN NOT NULL DEFAULT FALSE,
  push_requests BOOLEAN NOT NULL DEFAULT TRUE,
  push_messages BOOLEAN NOT NULL DEFAULT TRUE,
  push_payments BOOLEAN NOT NULL DEFAULT TRUE,
  push_tasks BOOLEAN NOT NULL DEFAULT TRUE,
  push_reviews BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can read their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Populate preferences for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Trigger to automatically create preferences on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_user_preferences ON public.profiles;
CREATE TRIGGER trg_create_user_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();

