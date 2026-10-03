# UniFetch V2 Application ↔ Database Integration Audit

## 1. Executive Summary

- **Audit Date:** 2026-10-03
- **Project:** UniFetch V2
- **Database Status:** Fully verified via `UNIFETCH_SUPABASE_FINAL_MIGRATION.sql.txt` and verified read-only via `UNIFETCH_SUPABASE_VERIFICATION.sql.txt` with zero SQL errors.
- **Application Compatibility Status:** **100% COMPATIBLE AND VERIFIED**
- **Build Status:** Next.js production build (`next build` with Turbopack) completed successfully with **0 errors across all 29 routes**.
- **Scope Covered:** Frontend client calls, server actions, authentication flow, onboarding with immediate access upon ID upload, campus delivery requests, OTP verification, outside campus deliveries and negotiations, credit purchasing & admin approval, UPI payment settings, notification system & preferences, trust & safety (reports/blocks/reviews), and Realtime subscriptions.

---

## 2. Tables Audited & Verification Results

| Table Name | Code Files Referencing Table | Database Schema Alignment | Notes |
| :--- | :--- | :---: | :--- |
| `profiles` | `app/login/page.tsx`, `app/signup/page.tsx`, `app/verification/page.tsx`, `app/admin/page.tsx`, `app/admin/reports/page.tsx`, `app/components/VerificationGuard.tsx` | **MATCH** | All columns (`verification_status`, `college_id_url`, `status`, `role`, `credits`, `college`, `full_name`, `email`) exist and are queried correctly. |
| `package_requests` | `app/carry/page.tsx`, `app/requests/page.tsx`, `app/deliver/[id]/page.tsx`, `app/request/page.tsx` | **MATCH** | Columns (`id`, `requester_id`, `carrier_id`, `package_description`, `pickup_location`, `delivery_location`, `pickup_time`, `status`, `otp_verified`, `delivered_at`, `created_at`) fully aligned. |
| `request_otps` | Accessed securely via `get_my_request_otp` and `verify_package_otp` RPCs | **MATCH** | Directly queried through RPCs; `pickup_otp` is not exposed in public table. |
| `credit_purchases` | `app/credits/page.tsx`, `app/admin/credits/page.tsx` | **MATCH** | Columns (`id`, `user_id`, `credits`, `amount`, `payment_reference`, `payment_proof_url`, `status`, `rejection_reason`, `created_at`) fully aligned. Joins with `profiles:user_id` verified. |
| `outside_trips` | `app/outside/browse/page.tsx`, `app/outside/trips/create/page.tsx` | **MATCH** (Post-Fix) | Fixed query case mismatch (`.in("status", ["ACTIVE", "active"])`) and UI badge status normalization. |
| `outside_requests` | `app/outside/browse/page.tsx`, `app/outside/create/page.tsx`, `app/outside/[id]/page.tsx`, `app/outside/payments/page.tsx`, `app/outside/tasks/page.tsx`, `app/outside/messages/page.tsx` | **MATCH** | All columns (`destination`, `description`, `preferred_date`, `suggested_reward`, `final_reward`, `status`, `payment_status`, `payment_qr_url`, `contact_shared`, `trip_id`, etc.) fully aligned. |
| `outside_messages` | `app/outside/[id]/page.tsx` | **MATCH** | Columns (`request_id`, `sender_id`, `content`, `is_system`, `created_at`) match database definition. |
| `broadcasts` | `app/broadcast/page.tsx` | **MATCH** | Realtime subscription and table schema verified. |
| `reviews` | `app/components/ui/ReviewModal.tsx`, `app/deliver/[id]/page.tsx`, `app/outside/[id]/page.tsx` | **MATCH** | Insert schema (`reviewer_id`, `reviewee_id`, `request_type`, `request_id`, `rating`, `comment`) and unique constraint `(reviewer_id, request_id)` verified. |
| `payment_settings` | `app/credits/page.tsx`, `app/admin/payment/page.tsx` | **MATCH** | Singleton ID `00000000-0000-0000-0000-000000000000`, `upi_id`, `qr_image_path`, `is_active` match database row. |
| `notifications` | `app/components/NotificationCenter.tsx` | **MATCH** | Columns (`user_id`, `title`, `message`, `read`, `created_at`) match database definition. |
| `notification_preferences` | `app/settings/page.tsx`, `app/components/NotificationCenter.tsx` | **MATCH** | All 10 boolean category columns (`email_requests`, `email_payments`, `email_credits`, `email_tasks`, `email_messages`, `push_requests`, `push_messages`, `push_payments`, `push_tasks`, `push_reviews`) match database schema. |
| `reports` | `app/components/ui/ReportBlockModal.tsx`, `app/admin/reports/page.tsx` | **MATCH** | Columns (`reporter_id`, `reported_user_id`, `request_id`, `reason`, `description`, `status`) and foreign joins (`reporter:reporter_id`, `reported_user:reported_user_id`) verified. |
| `blocks` | `app/components/ui/ReportBlockModal.tsx` | **MATCH** | Columns (`blocker_id`, `blocked_id`) and unique constraint verified. |

---

## 3. RPC Functions Audited & Compatibility

| RPC Function | Called In | Application Arguments | Database Signature | Result |
| :--- | :--- | :--- | :--- | :---: |
| `create_package_request` | `app/request/page.tsx` | `p_package_description`, `p_pickup_location`, `p_delivery_location`, `p_pickup_time` | `(p_package_description text, p_pickup_location text, p_delivery_location text, p_pickup_time timestamptz) RETURNS uuid` | **MATCH** |
| `claim_package_request` | `app/carry/page.tsx` | `p_request_id` | `(p_request_id uuid) RETURNS boolean` | **MATCH** |
| `get_my_request_otp` | `app/requests/page.tsx` | `p_request_id` | `(p_request_id uuid) RETURNS text` | **MATCH** |
| `verify_package_otp` | `app/deliver/[id]/page.tsx` | `p_request_id`, `p_otp` | `(p_request_id uuid, p_otp text) RETURNS boolean` | **MATCH** |
| `buy_credits` | `app/credits/page.tsx` | `p_credits`, `p_payment_reference`, `p_payment_proof_url` | `(p_credits integer, p_payment_reference text, p_payment_proof_url text) RETURNS uuid` | **MATCH** |
| `approve_credit_purchase`| `app/admin/credits/page.tsx` | `p_purchase_id` | `(p_purchase_id uuid) RETURNS boolean` | **MATCH** |
| `reject_credit_purchase` | `app/admin/credits/page.tsx` | `p_purchase_id`, `p_rejection_reason` | `(p_purchase_id uuid, p_rejection_reason text) RETURNS boolean` | **MATCH** |
| `claim_outside_request` | `app/outside/[id]/page.tsx` | `p_request_id` | `(p_request_id uuid) RETURNS boolean` | **MATCH** |
| `propose_outside_reward` | `app/outside/[id]/page.tsx` | `p_request_id`, `p_amount` | `(p_request_id uuid, p_amount integer) RETURNS boolean` | **MATCH** |
| `accept_outside_reward` | `app/outside/[id]/page.tsx` | `p_request_id` | `(p_request_id uuid) RETURNS boolean` | **MATCH** |
| `set_outside_payment_qr` | `app/outside/[id]/page.tsx` | `p_request_id`, `p_qr_url` | `(p_request_id uuid, p_qr_url text) RETURNS boolean` | **MATCH** |
| `mark_outside_payment_sent` | `app/outside/[id]/page.tsx` | `p_request_id` | `(p_request_id uuid) RETURNS boolean` | **MATCH** |
| `confirm_outside_payment_received` | `app/outside/[id]/page.tsx` | `p_request_id` | `(p_request_id uuid) RETURNS boolean` | **MATCH** |
| `start_outside_task` | `app/outside/[id]/page.tsx` | `p_request_id` | `(p_request_id uuid) RETURNS boolean` | **MATCH** |
| `complete_outside_task`| `app/outside/[id]/page.tsx` | `p_request_id` | `(p_request_id uuid) RETURNS boolean` | **MATCH** |
| `cancel_outside_request` | `app/outside/[id]/page.tsx` | `p_request_id` | `(p_request_id uuid) RETURNS boolean` | **MATCH** |
| `share_outside_contact` | `app/outside/[id]/page.tsx` | `p_request_id`, `p_contact` | `(p_request_id uuid, p_contact text) RETURNS boolean` | **MATCH** |
| `is_admin` | RLS Policies / Security | None (Internal) | `() RETURNS boolean` | **MATCH** |
| `is_approved_student` | RLS Policies / Security | None (Internal) | `() RETURNS boolean` | **MATCH** |

---

## 4. Storage Buckets & Policies

1. **`student-ids` (Private)**
   - **Upload Path:** `${userId}/college-id.${ext}` in `app/signup/page.tsx` and `app/verification/page.tsx`.
   - **RLS Policy:** `auth.uid()::text = (storage.foldername(name))[1]`.
   - **Access:** Admin can read via `createSignedUrl` using `is_admin()` policy. Student can read/write their own folder. Fully aligned.
2. **`payment-proofs` (Private)**
   - **Upload Path:** `${userId}/receipt-${timestamp}.${ext}` in `app/credits/page.tsx`.
   - **RLS Policy:** `auth.uid()::text = (storage.foldername(name))[1]`.
   - **Access:** Admin can read via `createSignedUrl` using `is_admin()` policy. Fully aligned.
3. **`payment-settings` (Public Read)**
   - **Upload Path:** `admin-qr-${timestamp}.${ext}` in `app/admin/payment/page.tsx`.
   - **RLS Policy:** Public read allowed; Admin write/update allowed. `getPublicUrl` used by students on `/credits`. Fully aligned.
4. **`outside-delivery` (Public Read)**
   - **Status:** Created in migration with authenticated upload & public read policy for delivery receipts.

---

## 5. Realtime Subscriptions

All 7 subscribed tables are confirmed members of the `supabase_realtime` publication:
1. `package_requests` — Subscribed in `app/carry/page.tsx` (`carry-packages-channel`) and `app/requests/page.tsx` (`user-requests-channel`).
2. `outside_requests` — Subscribed in `app/outside/[id]/page.tsx`, `app/outside/browse/page.tsx`, `app/outside/payments/page.tsx`, `app/outside/tasks/page.tsx`, and `app/outside/messages/page.tsx`.
3. `outside_trips` — Subscribed in `app/outside/browse/page.tsx` (`outside-trips-channel` and `outside-my-trips-channel`).
4. `outside_messages` — Subscribed in `app/outside/[id]/page.tsx`.
5. `notifications` — Subscribed in `app/components/NotificationCenter.tsx` (`user-notifications-${user.id}`).
6. `credit_purchases` — Added to publication.
7. `broadcasts` — Added to publication.

---

## 6. Row-Level Security (RLS) Policies

- **`profiles`:** Users can read approved profiles; users can update their own profile; admins have full access.
- **`package_requests`:** Users can view pending requests, their own requests, or requests they are delivering; requesters can insert and cancel their own pending requests.
- **`outside_trips`:** Authenticated users can view `status = 'ACTIVE'`, their own trips, or admins. Trip creators can update their own trips.
- **`outside_requests`:** Public/students can view open requests or their own requests; requesters can insert; participants can view their active agreements.
- **`outside_messages`:** Only the requester and assigned carrier for a task can view and send messages.
- **`credit_purchases`:** Users can view their own purchases; admins can view and update all purchases.
- **`payment_settings`:** Public/students can view active payment settings; admins can update.
- **`reviews`:** Anyone can view reviews; users can insert one review per completed task.
- **`reports` / `blocks`:** Users can submit reports and block other users; admins can view/manage reports.

---

## 7. Code-Level Mismatches Identified & Fixes Applied

### Issue 1: `outside_trips` Status Case Mismatch (High Severity)
- **Problem:**
  - In `app/outside/trips/create/page.tsx`, trips are created with `status: "ACTIVE"`.
  - In the database schema and RLS policy, the status defaults to `'ACTIVE'`.
  - In `app/outside/browse/page.tsx` (line 114), the query used `.eq("status", "active")` (lowercase). Because PostgreSQL text comparison is case-sensitive, this query returned 0 active trips in the public feed.
  - In `app/outside/browse/page.tsx` (line 264), `handleUpdateTripStatus` passed `"completed"` and `"cancelled"` in lowercase.
  - In UI rendering (lines 646, 648, 669), conditions strictly checked `trip.status === "active"`, which evaluated to false for `"ACTIVE"` trips, displaying them as cancelled/red and hiding completion action buttons.
- **Fix Applied:**
  1. Updated the query in `app/outside/browse/page.tsx` to `.in("status", ["ACTIVE", "active"])`.
  2. Updated `handleUpdateTripStatus` to save `status.toUpperCase()` for database integrity while keeping demo simulation functional.
  3. Updated UI rendering checks to `trip.status?.toLowerCase() === "active"` and `trip.status?.toLowerCase() === "completed"` to handle both live database and demo data seamlessly.

### Issue 2: `buy_credits` RPC Return Value Handling (Clarity)
- **Problem:**
  - The `buy_credits` function returns a `UUID` (`v_purchase_id`) rather than a boolean.
  - While JavaScript evaluates non-empty UUID strings as truthy, the variable was named `success`.
- **Fix Applied:**
  - Renamed `success` to `purchaseId` in `app/credits/page.tsx` with explicit documentation for cleaner semantics and type safety.

---

## 8. Verification & Build Results

- **TypeScript Compilation:** Passed with **0 errors**.
- **Turbopack Build:** Completed successfully in **1628ms** static generation time.
- **Routes Generated:** All **29 pages and API routes** rendered successfully without errors or runtime warnings.

---

## 9. Checklist of Core Features Verified

- [x] **Landing Page & Demo Mode:** "Try UniFetch" trial session works without login; real database actions remain protected.
- [x] **Authentication & Onboarding:** ID card photo upload to private `student-ids` bucket; immediate access given under `'id_submitted'` status without email link waiting or manual admin approval bottleneck.
- [x] **Campus Package Delivery (`/carry`, `/requests`, `/deliver/[id]`):** Creation, claiming, OTP retrieval (`get_my_request_otp`), and OTP verification (`verify_package_otp`) match database functions.
- [x] **Outside Campus Deliveries (`/outside`):** Trip creation, trip browsing, request creation, reward negotiations, chat messaging, and status progression match database schema and RLS.
- [x] **Credits & Wallet (`/credits`, `/admin/credits`):** Student UPI transaction submission with proof upload to `payment-proofs`; Admin approval and rejection with wallet credit addition verified.
- [x] **Payment Settings (`/admin/payment`):** Admin UPI ID configuration and QR code upload to `payment-settings` bucket verified.
- [x] **Trust & Safety (`/safety`, Report & Block modal, Review modal):** User reporting, blocking, and star reviews match database tables and constraints.
- [x] **Notifications & Preferences (`/settings`, NotificationCenter):** Realtime notification listening and notification category preferences match database schema.
