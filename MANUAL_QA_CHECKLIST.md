# UniFetch V2 — Final Manual QA Checklist

**Generated:** 2026-08-29  
**Build Status:** ✅ PASS (29 routes, 0 TypeScript errors)  
**Lint Status:** ✅ 0 errors (22 warnings — non-blocking)  
**Scope:** Read-only verification plan — **NO code changes, NO test data creation, NO production mutations**

---

## Flow 1: Student Signup / Login / Logout

| Item | Detail |
|------|--------|
| **Accounts Required** | 2 fresh student emails (unverified), 1 verified student email (for re-login) |
| **Steps** | 1. Visit `/signup` → enter email → submit<br>2. Check email for magic link / OTP → click<br>3. Complete profile setup (name, college, role)<br>4. Verify redirect to dashboard<br>5. Click logout → confirm redirect to `/login`<br>6. Re-login with verified account |
| **Expected** | Magic link/OTP delivered; profile created in `profiles` table with `verification_status: 'pending'`; session persists across refresh; logout clears session |
| **Failure** | No email delivered; profile not created; redirect loop; session not cleared on logout |
| **Test Accounts** | ✅ Safe with test emails (no real money) |
| **Real Money** | ❌ No |
| **Production Data Risk** | ❌ Creates `auth.users` + `profiles` rows (cleanup needed) |
| **Status** | **UNVERIFIED** |

---

## Flow 2: Profile Setup

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 freshly signed-up student (verification_status: pending) |
| **Steps** | 1. After signup, redirected to `/verification`<br>2. Enter college email → request verification OTP<br>3. Enter OTP → submit<br>4. Verify `verification_status` becomes `verified`<br>5. Visit `/settings` → edit name, phone, avatar<br>6. Save → verify changes persist |
| **Expected** | OTP sent to college email; `verification_status` updated to `verified`; profile edits saved; avatar upload to `avatars` bucket works |
| **Failure** | OTP not sent/accepted; verification_status stuck `pending`; avatar upload fails; edits not persisted |
| **Test Accounts** | ✅ Safe with test college emails |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Updates `profiles`, writes to `avatars` storage |
| **Status** | **UNVERIFIED** |

---

## Flow 3: Within-College Request Creation

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 verified student (≥50 credits), 1 verified student (carrier) |
| **Steps** | 1. Login as requester → `/request`<br>2. Select category → fill details (pickup, dropoff, description)<br>3. Submit → confirm 50 credits deducted<br>4. Verify request appears in `/requests` with status `OPEN`<br>5. Verify notification sent to potential carriers |
| **Expected** | Credits deducted atomically via RPC; request row created with `type: 'campus'`, `status: 'OPEN'`, `credits: 50`; realtime notification broadcasts |
| **Failure** | Credits not deducted; request not created; status not `OPEN`; notification not sent |
| **Test Accounts** | ✅ Safe (credits are internal) |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Creates `requests`, `transactions`, `notifications` rows |
| **Status** | **UNVERIFIED** |

---

## Flow 4: Within-College Request Claiming

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 verified student (carrier), 1 existing `OPEN` campus request |
| **Steps** | 1. Login as carrier → `/carry` or `/available`<br>2. Find request → click "Claim"<br>3. Verify request status → `IN_PROGRESS`, `carrier_id` set<br>4. Verify requester notified |
| **Expected** | Request locked to carrier; status `IN_PROGRESS`; carrier_id populated; notification to requester |
| **Failure** | Race condition (double-claim); status not updated; carrier_id null; no notification |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Updates `requests`, creates `notifications` |
| **Status** | **UNVERIFIED** |

---

## Flow 5: OTP Completion (Within-College Delivery)

| Item | Detail |
|------|--------|
| **Accounts Required** | Same pair from Flow 4 (requester + carrier) |
| **Steps** | 1. Carrier arrives at dropoff → opens request detail (`/deliver/[id]`)<br>2. Requester shares 4-digit OTP verbally<br>3. Carrier enters OTP → submit<br>4. Verify status → `COMPLETED`<br>5. Verify 50 credits transferred to carrier<br>6. Verify both parties notified |
| **Expected** | OTP validated via `verify_delivery_otp` RPC; credits transferred atomically; status `COMPLETED`; `completed_at` timestamp; both notified |
| **Failure** | Invalid OTP accepted; valid OTP rejected; credits not transferred; status stuck `IN_PROGRESS`; no notification |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Updates `requests`, `transactions`, `credits`, `notifications` |
| **Status** | **UNVERIFIED** |

---

## Flow 6: Credit Purchase (Student → Admin UPI/QR)

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 verified student (low credits), admin-configured UPI/QR in `payment_settings` |
| **Steps** | 1. Login as student → `/credits`<br>2. Select pack (e.g., 100 credits = ₹100)<br>3. Copy UPI ID / scan QR → pay via any UPI app<br>4. Upload payment screenshot → submit proof<br>5. Verify request appears in `/admin/credits` as `PENDING` |
| **Expected** | Purchase row created in `credit_purchases` with `status: 'PENDING'`; UPI/QR matches admin settings; screenshot uploaded to `payment-proofs` bucket |
| **Failure** | No admin UPI/QR configured; purchase not recorded; screenshot upload fails; wrong amount accepted |
| **Test Accounts** | ⚠️ **REAL MONEY** if using real UPI — use test UPI ID or small amount (₹1) |
| **Real Money** | ⚠️ **YES** — actual UPI payment required |
| **Production Data Risk** | ⚠️ Creates `credit_purchases`, uploads to `payment-proofs` |
| **Status** | **UNVERIFIED** |

---

## Flow 7: Admin Credit Approval

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 admin account, 1 pending credit purchase (from Flow 6) |
| **Steps** | 1. Login as admin → `/admin/credits`<br>2. Review pending purchase → verify screenshot matches amount<br>3. Click "Approve"<br>4. Verify student credits increased<br>5. Verify purchase status → `APPROVED`<br>6. Verify student notified |
| **Expected** | Credits added via `add_credits` RPC; purchase status `APPROVED`; transaction logged; notification sent |
| **Failure** | Credits not added; status not updated; notification failed; approver not logged |
| **Test Accounts** | ✅ Safe if Flow 6 used test payment |
| **Real Money** | ❌ No (approval only) |
| **Production Data Risk** | ⚠️ Updates `credit_purchases`, `profiles.credits`, `transactions` |
| **Status** | **UNVERIFIED** |

---

## Flow 8: Outside Campus Trip Announcement

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 verified student (traveller) |
| **Steps** | 1. Login → `/outside/create`<br>2. Fill trip: origin, destination, date, time, vehicle, capacity, price per package<br>3. Submit → verify trip appears in `/outside/browse`<br>4. Verify trip status `ACTIVE` |
| **Expected** | Trip row in `outside_trips` with `status: 'ACTIVE'`; visible in browse; capacity tracked |
| **Failure** | Trip not created; not visible in browse; capacity/price not saved |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Creates `outside_trips` row |
| **Status** | **UNVERIFIED** |

---

## Flow 9: Outside Campus Request + Negotiation

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 traveller (trip owner), 1 sender (requester) |
| **Steps** | 1. Sender browses trips → `/outside/browse` → select trip<br>2. Create request: package details, proposed reward<br>3. Traveller receives notification → `/outside/tasks`<br>4. Traveller counters or accepts reward<br>5. Sender accepts counter or confirms<br>6. Verify request status → `NEGOTIATED` → `ACCEPTED` |
| **Expected** | Negotiation messages in `outside_request_messages`; reward agreed; status `ACCEPTED`; both notified |
| **Failure** | Messages not saved; reward mismatch; status stuck; no notifications |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No (negotiation only) |
| **Production Data Risk** | ⚠️ Creates `outside_requests`, `outside_request_messages` |
| **Status** | **UNVERIFIED** |

---

## Flow 10: QR / Payment Sharing Inside Chat

| Item | Detail |
|------|--------|
| **Accounts Required** | Same pair from Flow 9 (accepted outside request) |
| **Steps** | 1. Open chat for accepted request (`/outside/messages` or request detail)<br>2. Sender clicks "Share Payment Details"<br>3. Enters UPI ID / uploads QR image<br>4. Traveller sees shared details in chat<br>5. Traveller pays via UPI<br>6. Traveller clicks "Mark Payment Sent" |
| **Expected** | Payment details stored in `outside_requests.payment_details` or messages; QR uploaded to `payment-qrs` bucket; traveller can view; "Payment Sent" button appears |
| **Failure** | Details not saved; QR upload fails; traveller cannot see details; button missing |
| **Test Accounts** | ✅ Safe (test UPI/QR) |
| **Real Money** | ⚠️ **YES** if traveller actually pays — use test UPI |
| **Production Data Risk** | ⚠️ Updates `outside_requests`, uploads to `payment-qrs` |
| **Status** | **UNVERIFIED** |

---

## Flow 11: Payment Sent → Payment Confirmed

| Item | Detail |
|------|--------|
| **Accounts Required** | Same pair from Flow 10 |
| **Steps** | 1. Traveller marks "Payment Sent"<br>2. Sender receives notification → verifies payment in their UPI app<br>3. Sender clicks "Confirm Payment Received"<br>4. Verify request status → `PAYMENT_CONFIRMED`<br>5. Verify both notified |
| **Expected** | Status `PAYMENT_CONFIRMED`; `payment_confirmed_at` timestamp; notifications; request moves to delivery phase |
| **Failure** | Status not updated; sender cannot confirm; no notifications; double-confirm possible |
| **Test Accounts** | ✅ Safe (test payment) |
| **Real Money** | ⚠️ **YES** if real payment sent — use test UPI |
| **Production Data Risk** | ⚠️ Updates `outside_requests`, `notifications` |
| **Status** | **UNVERIFIED** |

---

## Flow 12: IN PROGRESS → COMPLETED (Outside Campus)

| Item | Detail |
|------|--------|
| **Accounts Required** | Same pair from Flow 11 |
| **Steps** | 1. Traveller picks up package → marks "Picked Up" (`IN_PROGRESS`)<br>2. Traveller delivers → marks "Delivered"<br>3. Sender receives OTP / confirms delivery<br>4. Verify status → `COMPLETED`<br>5. Verify reward released to traveller (if escrow) |
| **Expected** | Status transitions: `PAYMENT_CONFIRMED` → `IN_PROGRESS` → `COMPLETED`; OTP or mutual confirmation; reward transferred; both notified |
| **Failure** | Status stuck; OTP not working; reward not released; no completion timestamp |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No (payment already confirmed) |
| **Production Data Risk** | ⚠️ Updates `outside_requests`, `transactions`, `notifications` |
| **Status** | **UNVERIFIED** |

---

## Flow 13: Reviews

| Item | Detail |
|------|--------|
| **Accounts Required** | Any two users who completed a request (campus or outside) |
| **Steps** | 1. After completion, review modal appears<br>2. Rate 1–5 stars, add comment<br>3. Submit<br>4. Verify review appears on reviewee's profile<br>5. Verify average rating updates |
| **Expected** | Review row in `reviews`; `rating`, `comment` saved; reviewee `avg_rating` and `review_count` updated via trigger; reviewer cannot review twice (unique constraint) |
| **Failure** | Review not saved; duplicate allowed; avg_rating not updated; modal doesn't appear |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Creates `reviews`, updates `profiles` |
| **Status** | **UNVERIFIED** |

---

## Flow 14: Broadcasts

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 verified student (broadcaster), 2+ other verified students |
| **Steps** | 1. Login as broadcaster → `/broadcast`<br>2. Create broadcast: message, category, optional destination/time<br>3. Verify appears in feed for all users instantly (realtime)<br>4. Filter by category tabs<br>5. Broadcaster cancels own broadcast → verify removed |
| **Expected** | Broadcast in `broadcasts` table; realtime subscription delivers to all open clients; category filter works; cancel sets `status: 'cancelled'`; only owner can cancel |
| **Failure** | Not realtime; filter broken; non-owner can cancel; cancelled still visible |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Creates/updates `broadcasts` |
| **Status** | **UNVERIFIED** |

---

## Flow 15: Realtime Notifications

| Item | Detail |
|------|--------|
| **Accounts Required** | 2+ verified students (one triggers, others receive) |
| **Steps** | 1. User A triggers events: creates request, gets claimed, receives message, gets review<br>2. User B (online) observes bell badge increment instantly<br>3. Open dropdown → verify new notifications listed<br>4. Click notification → navigate to correct page<br>5. Verify unread count decrements on read |
| **Expected** | Supabase Realtime delivers `INSERT` on `notifications`; badge updates without refresh; click navigates via `link`; `read` flag set on click |
| **Failure** | No realtime delivery; badge stale; wrong link; read flag not set |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Creates/updates `notifications` |
| **Status** | **UNVERIFIED** |

---

## Flow 16: Notification Preferences

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 verified student |
| **Steps** | 1. Open notification dropdown → click "Preferences" (or `/settings` → Notifications)<br>2. Toggle email/push for each category<br>3. Save → verify persisted<br>4. Trigger event for disabled category → verify no email/push sent |
| **Expected** | Preferences saved to `notification_preferences`; email/push suppressed per category; browser push permission requested if enabled |
| **Failure** | Preferences not saved; emails still sent for disabled categories; push not working |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Updates `notification_preferences` |
| **Status** | **UNVERIFIED** |

---

## Flow 17: Reporting / Blocking

| Item | Detail |
|------|--------|
| **Accounts Required** | 2 verified students (reporter + reported), 1 admin |
| **Steps** | 1. Reporter opens request/chat → clicks "Report"<br>2. Selects reason, adds description → submits<br>3. Admin → `/admin/reports` → sees new report `OPEN`<br>4. Admin clicks "Set Reviewing" → `REVIEWING`<br>5. Admin clicks "Mark Resolved" → `RESOLVED`<br>6. Verify reported user can be blocked (if implemented) |
| **Expected** | Report in `reports` table; admin workflow updates status; block creates `blocks` row (if exists); both parties notified |
| **Failure** | Report not created; admin cannot see; status transitions fail; block not enforced |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Creates `reports`, possibly `blocks` |
| **Status** | **UNVERIFIED** |

---

## Flow 18: Account Deactivation

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 verified student (willing to deactivate) |
| **Steps** | 1. Login → `/settings` → "Deactivate Account"<br>2. Confirm password / reason<br>3. Submit → verify logged out<br>4. Attempt login → should fail<br>5. Admin checks → user marked inactive |
| **Expected** | `profiles.is_active = false` or `deleted_at` set; auth session revoked; cannot login; data retained for admin review |
| **Failure** | Account still active; can still login; data hard-deleted; no admin visibility |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Updates `profiles`, revokes auth session |
| **Status** | **UNVERIFIED** |

---

## Flow 19: Mobile UI

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 verified student |
| **Steps** | 1. Open site on mobile (Chrome DevTools device toolbar or real phone)<br>2. Test: signup, login, request creation, chat, broadcast, notifications dropdown, settings<br>3. Verify: no horizontal scroll; touch targets ≥44px; modals fit viewport; bottom nav (if any) accessible |
| **Expected** | All flows usable at 375px width; no layout shift; safe-area insets respected; keyboard doesn't cover inputs |
| **Failure** | Horizontal overflow; tiny tap targets; modal cutoff; keyboard covers input; navbar overlaps content |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ❌ Read-only visual check |
| **Status** | **UNVERIFIED** |

---

## Flow 20: Admin Payment Settings

| Item | Detail |
|------|--------|
| **Accounts Required** | 1 admin account |
| **Steps** | 1. Login as admin → `/admin/payment`<br>2. Update UPI ID → save<br>3. Upload new QR image → save<br>4. Verify preview updates<br>5. Login as student → `/credits` → verify new UPI/QR shown |
| **Expected** | `payment_settings` row updated; QR uploaded to `payment-settings` bucket; public URL accessible; students see updated details immediately |
| **Failure** | Save fails; QR not uploaded; preview stale; students see old UPI/QR |
| **Test Accounts** | ✅ Safe |
| **Real Money** | ❌ No |
| **Production Data Risk** | ⚠️ Updates `payment_settings`, uploads to `payment-settings` bucket |
| **Status** | **UNVERIFIED** |

---

## Summary Matrix

| # | Flow | Status | Real Money | Prod Data Risk | Test Accounts Safe |
|---|------|--------|------------|----------------|-------------------|
| 1 | Signup/Login/Logout | UNVERIFIED | No | ⚠️ Creates users | ✅ |
| 2 | Profile Setup | UNVERIFIED | No | ⚠️ Updates profiles, storage | ✅ |
| 3 | Campus Request Create | UNVERIFIED | No | ⚠️ Creates requests, txns | ✅ |
| 4 | Campus Request Claim | UNVERIFIED | No | ⚠️ Updates requests | ✅ |
| 5 | OTP Completion | UNVERIFIED | No | ⚠️ Updates requests, credits | ✅ |
| 6 | Credit Purchase | UNVERIFIED | **YES** | ⚠️ Creates purchases, storage | ⚠️ Use test UPI |
| 7 | Admin Credit Approval | UNVERIFIED | No | ⚠️ Updates credits, txns | ✅ |
| 8 | Outside Trip Create | UNVERIFIED | No | ⚠️ Creates trips | ✅ |
| 9 | Outside Request + Negotiate | UNVERIFIED | No | ⚠️ Creates requests, msgs | ✅ |
| 10 | QR/Payment Share | UNVERIFIED | ⚠️ If real pay | ⚠️ Updates requests, storage | ✅ (test UPI) |
| 11 | Payment Sent → Confirmed | UNVERIFIED | ⚠️ If real pay | ⚠️ Updates requests | ✅ (test UPI) |
| 12 | Outside In Progress → Done | UNVERIFIED | No | ⚠️ Updates requests, txns | ✅ |
| 13 | Reviews | UNVERIFIED | No | ⚠️ Creates reviews, updates profiles | ✅ |
| 14 | Broadcasts | UNVERIFIED | No | ⚠️ Creates broadcasts | ✅ |
| 15 | Realtime Notifications | UNVERIFIED | No | ⚠️ Creates notifications | ✅ |
| 16 | Notification Preferences | UNVERIFIED | No | ⚠️ Updates prefs | ✅ |
| 17 | Report/Block | UNVERIFIED | No | ⚠️ Creates reports/blocks | ✅ |
| 18 | Account Deactivation | UNVERIFIED | No | ⚠️ Updates profiles | ✅ |
| 19 | Mobile UI | UNVERIFIED | No | ❌ Visual only | ✅ |
| 20 | Admin Payment Settings | UNVERIFIED | No | ⚠️ Updates settings, storage | ✅ |

---

## VERIFIED
*None — all 20 flows require manual QA with real accounts.*

---

## NEEDS MANUAL TESTING
**All 20 flows listed above.** Each requires:
- Real Supabase project with live database
- Real authentication (email magic links / OTP)
- Real Supabase Realtime connections
- Real Storage buckets (avatars, payment-proofs, payment-qrs, payment-settings)
- At least 2–3 test user accounts + 1 admin account

---

## POTENTIAL BLOCKERS

| Blocker | Impact | Mitigation |
|---------|--------|------------|
| **No test email domain** | Cannot receive magic links / verification OTPs | Use disposable email service (e.g., Mailinator) or configure test SMTP |
| **No admin account exists** | Cannot test Flows 7, 17, 20 | Create admin via SQL: `update profiles set role='admin' where id='...'` |
| **No UPI test environment** | Flow 6, 10, 11 need UPI payment | Use `upi://pay?pa=test@upi&am=1` test deep link or small ₹1 real payment |
| **Storage buckets not public** | QR/avatar uploads fail | Verify bucket policies: `payment-proofs`, `payment-qrs`, `payment-settings`, `avatars` allow authenticated upload + public read |
| **Realtime not enabled** | Flows 14, 15 fail silently | Check Supabase Dashboard → Realtime → `broadcasts`, `notifications`, `outside_requests`, `outside_request_messages` enabled |
| **RLS policies too strict** | Test accounts cannot read/write | Verify policies allow `auth.uid()` access for own data |
| **Resend API key missing** | Email notifications (Flow 16) won't send | Add `RESEND_API_KEY` to env or accept graceful degradation |
| **One-way deactivation** | Flow 18 may not be reversible | Test with disposable account only |

---

## FINAL DEPLOYMENT REQUIREMENTS

Before marking **PRODUCTION-READY**, the following must be **VERIFIED** by human tester:

- [ ] All 20 flows tested end-to-end with real accounts
- [ ] No **BLOCKED** items remain unresolved
- [ ] Payment flows (6, 10, 11) tested with actual UPI (even ₹1)
- [ ] Realtime verified across multiple browser tabs/devices
- [ ] Mobile UI tested on real iOS Safari + Android Chrome
- [ ] Admin account created and functional
- [ ] Storage bucket policies verified (upload + public read)
- [ ] Email delivery verified (Resend configured or graceful skip confirmed)
- [ ] Cleanup plan for test data documented (SQL to remove test users/requests)
- [ ] Rollback plan documented (Vercel instant rollback + Supabase PITR)

---

**DO NOT DEPLOY UNTIL ALL CHECKLIST ITEMS ARE MANUALLY VERIFIED.**