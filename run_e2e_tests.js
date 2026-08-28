/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables. Please check .env.local.");
  process.exit(1);
}

// Helper to construct a client
function getClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

const reqEmailOverride = process.env.TEST_REQ_EMAIL;
const reqPasswordOverride = process.env.TEST_REQ_PASSWORD || 'TestPassword123!';

const carEmailOverride = process.env.TEST_CAR_EMAIL;
const carPasswordOverride = process.env.TEST_CAR_PASSWORD || 'TestPassword123!';

const admEmailOverride = process.env.TEST_ADM_EMAIL;
const admPasswordOverride = process.env.TEST_ADM_PASSWORD || 'TestPassword123!';

const useOverrides = !!(reqEmailOverride && carEmailOverride && admEmailOverride);

const reqEmail = reqEmailOverride || `test_student_e2e_req_${Date.now()}@unifetch.com`;
const carEmail = carEmailOverride || `test_student_e2e_car_${Date.now()}@unifetch.com`;
const admEmail = admEmailOverride || `test_admin_e2e_adm_${Date.now()}@unifetch.com`;
const defaultPassword = 'TestPassword123!';

const reqPassword = reqEmailOverride ? reqPasswordOverride : defaultPassword;
const carPassword = carEmailOverride ? carPasswordOverride : defaultPassword;
const admPassword = admEmailOverride ? admPasswordOverride : defaultPassword;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("🚀 Starting UniFetch End-to-End System Tests...\n");

  const client = getClient();
  let reqUser, carUser, admUser;

  if (!useOverrides) {
    // 1. Sign up users
    console.log(`[AUTH] Registering Requester (Student A): ${reqEmail}`);
    const { data: reqAuth, error: reqAuthErr } = await client.auth.signUp({
      email: reqEmail,
      password: reqPassword,
      options: { data: { full_name: 'E2E Requester Student' } }
    });
    if (reqAuthErr) throw new Error("Requester SignUp failed: " + reqAuthErr.message);
    reqUser = reqAuth.user;

    console.log(`[AUTH] Registering Carrier (Student B): ${carEmail}`);
    const { data: carAuth, error: carAuthErr } = await client.auth.signUp({
      email: carEmail,
      password: carPassword,
      options: { data: { full_name: 'E2E Carrier Student' } }
    });
    if (carAuthErr) throw new Error("Carrier SignUp failed: " + carAuthErr.message);
    carUser = carAuth.user;

    console.log("✅ Registration completed. Waiting for triggers to register profiles...\n");
    await delay(2000);
  }

  // Sign-in clients
  const reqClient = getClient();
  const carClient = getClient();
  const admClient = getClient();

  const adminEmail = admEmailOverride || "abhi7068702757@gmail.com";
  const adminPassword = admEmailOverride ? admPasswordOverride : "123456";

  console.log("[AUTH] Logging in Admin...");
  const { data: admSignIn, error: admLoginErr } = await admClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (admLoginErr) throw new Error("Admin login failed: " + admLoginErr.message);
  admUser = admSignIn.user;

  if (!useOverrides) {
    console.log("[AUTH] Admin approving Requester account...");
    const { error: appReqErr } = await admClient
      .from("profiles")
      .update({ verification_status: "approved" })
      .eq("id", reqUser.id);
    if (appReqErr) throw new Error("Admin failed to approve Requester: " + appReqErr.message);

    console.log("[AUTH] Admin approving Carrier account...");
    const { error: appCarErr } = await admClient
      .from("profiles")
      .update({ verification_status: "approved" })
      .eq("id", carUser.id);
    if (appCarErr) throw new Error("Admin failed to approve Carrier: " + appCarErr.message);
    console.log("✅ New test accounts successfully approved by Admin!");
  }

  console.log("[AUTH] Logging in Requester...");
  const { data: reqSignIn, error: reqLoginErr } = await reqClient.auth.signInWithPassword({ email: reqEmail, password: reqPassword });
  if (reqLoginErr) throw new Error("Requester login failed: " + reqLoginErr.message);
  reqUser = reqSignIn.user;

  console.log("[AUTH] Logging in Carrier...");
  const { data: carSignIn, error: carLoginErr } = await carClient.auth.signInWithPassword({ email: carEmail, password: carPassword });
  if (carLoginErr) throw new Error("Carrier login failed: " + carLoginErr.message);
  carUser = carSignIn.user;

  console.log("✅ Authenticated all accounts successfully!\n");

  // ---------------------------------------------------------------------------
  // PHASE 1: CREDITS PURCHASE & MANUAL APPROVAL
  // ---------------------------------------------------------------------------
  console.log("--- PHASE 1: CREDITS & MANUAL VERIFICATION ---");
  
  // Requester initial credits
  let { data: reqProfile, error: profileErr } = await reqClient.from('profiles').select('credits, verification_status').eq('id', reqUser.id).single();
  if (profileErr) {
    console.error("❌ Profile fetch error details:", profileErr);
    throw new Error("Could not fetch requester profile: " + profileErr.message);
  }
  console.log(`[CREDITS] Requester Status: ${reqProfile.verification_status} | Credits: ${reqProfile.credits}`);

  const utr = `UTR${Date.now()}`;
  const proofUrl = `${reqUser.id}/receipt-${Date.now()}.png`;

  console.log(`[CREDITS] Requester submits 100 credits purchase with UTR: ${utr}`);
  const { data: buyResult, error: buyError } = await reqClient.rpc('buy_credits', {
    p_credits: 100,
    p_payment_reference: utr,
    p_payment_proof_url: proofUrl
  });

  if (buyError) throw new Error("buy_credits RPC failed: " + buyError.message);
  console.log("✅ buy_credits RPC executed successfully.");

  // Verify that it is in pending state and credits are NOT added
  const { data: purchaseRecord, error: purError } = await reqClient
    .from('credit_purchases')
    .select('*')
    .eq('payment_reference', utr)
    .single();

  if (purError) throw new Error("Could not find credit_purchases record: " + purError.message);
  console.log(`[CREDITS] Log entry status: ${purchaseRecord.status} | Credits: ${purchaseRecord.credits} (Expect pending)`);

  const { data: reqProfileAfterSubmit } = await reqClient.from('profiles').select('credits').eq('id', reqUser.id).single();
  console.log(`[CREDITS] Requester credits after purchase submission: ${reqProfileAfterSubmit.credits} (Expect 100)`);
  if (reqProfileAfterSubmit.credits !== 100) throw new Error("Failed: Credits awarded automatically before approval!");

  // Approve purchase as Admin
  console.log(`[CREDITS] Admin approves purchase ID: ${purchaseRecord.id}`);
  const { data: approveResult, error: approveError } = await admClient.rpc('approve_credit_purchase', {
    p_purchase_id: purchaseRecord.id
  });

  if (approveError) throw new Error("approve_credit_purchase RPC failed: " + approveError.message);
  console.log("✅ approve_credit_purchase RPC executed successfully.");

  // Verify credits awarded
  const { data: reqProfileAfterApprove } = await reqClient.from('profiles').select('credits').eq('id', reqUser.id).single();
  console.log(`[CREDITS] Requester credits after admin approval: ${reqProfileAfterApprove.credits} (Expect 200)`);
  if (reqProfileAfterApprove.credits !== 200) throw new Error("Failed: Credits were not added to requester profile!");

  // Attempt duplicate approval
  console.log("[CREDITS] Testing duplicate approval prevention...");
  const { error: dupError } = await admClient.rpc('approve_credit_purchase', {
    p_purchase_id: purchaseRecord.id
  });
  if (dupError) {
    console.log("✅ Duplicate approval successfully blocked: " + dupError.message);
  } else {
    throw new Error("Failed: Double approval was permitted!");
  }
  console.log();

  // ---------------------------------------------------------------------------
  // PHASE 1.5: OUTSIDE CAMPUS TRIP ANNOUNCEMENTS
  // ---------------------------------------------------------------------------
  console.log("--- PHASE 1.5: TRIP ANNOUNCEMENTS ---");

  // Carrier creates a trip announcement
  console.log("[TRIPS] Carrier announces a trip to Chennai...");
  const { data: tripData, error: tripInsertError } = await carClient
    .from('outside_trips')
    .insert({
      creator_id: carUser.id,
      origin: 'College',
      destination: 'Chennai',
      departure_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days later
      departure_time: '10:00 AM',
      help_types: ['buy', 'pick_up'],
      note: 'Heading to Chennai for weekend, can carry back electronics',
      status: 'active'
    })
    .select()
    .single();

  if (tripInsertError) throw new Error("Failed to insert outside trip: " + tripInsertError.message);
  const tripId = tripData.id;
  console.log(`✅ Outside trip created with ID: ${tripId} | destination: ${tripData.destination}`);

  // Requester checks active trips from other users
  console.log("[TRIPS] Requester fetches active trips...");
  const { data: activeTrips, error: tripsErr } = await reqClient
    .from('outside_trips')
    .select('*')
    .eq('status', 'active');

  if (tripsErr) throw new Error("Failed to fetch active trips: " + tripsErr.message);
  const foundTrip = activeTrips.find(t => t.id === tripId);
  if (!foundTrip) throw new Error("Failed: Created trip was not visible to other authenticated users!");
  console.log(`✅ Requester successfully discovered trip to ${foundTrip.destination} by Carrier!`);
  console.log();

  // ---------------------------------------------------------------------------
  // PHASE 2: OUTSIDE CAMPUS log/negotiate/payout
  // ---------------------------------------------------------------------------
  console.log("--- PHASE 2: OUTSIDE CAMPUS errs/log/negotiate ---");

  // Requester inserts request (using direct INSERT allowed under RLS policy)
  console.log("[OUTSIDE] Requester creates an Outside Campus carrying request linked to trip...");
  const { data: reqData, error: reqInsertError } = await reqClient
    .from('outside_requests')
    .insert({
      requester_id: reqUser.id,
      request_type: 'buy',
      destination: 'Chennai',
      description: 'Get cold medicine from pharmacy',
      preferred_date: new Date().toISOString(),
      instructions: 'Knock on door when arriving',
      suggested_reward: 30,
      status: 'OPEN',
      trip_id: tripId
    })
    .select()
    .single();

  if (reqInsertError) throw new Error("Failed to insert outside request: " + reqInsertError.message);
  const taskId = reqData.id;
  console.log(`✅ Outside request created with ID: ${taskId} | status: ${reqData.status} | linked trip: ${reqData.trip_id}`);

  // Carrier claims request
  console.log(`[OUTSIDE] Carrier claims request: ${taskId}`);
  const { error: claimError } = await carClient.rpc('claim_outside_request', {
    p_request_id: taskId
  });
  if (claimError) throw new Error("claim_outside_request RPC failed: " + claimError.message);

  let { data: taskDetails } = await reqClient.from('outside_requests').select('*').eq('id', taskId).single();
  console.log(`[OUTSIDE] Status after claim: ${taskDetails.status} | Carrier ID: ${taskDetails.carrier_id.substring(0, 8)}... (Expect NEGOTIATING)`);
  if (taskDetails.status !== 'NEGOTIATING') throw new Error("Failed status mapping!");

  // Carrier proposes reward of 45
  console.log("[OUTSIDE] Carrier proposes reward: ₹45");
  const { error: propError } = await carClient.rpc('propose_outside_reward', {
    p_request_id: taskId,
    p_amount: 45
  });
  if (propError) throw new Error("propose_outside_reward RPC failed: " + propError.message);

  // Requester accepts proposal
  console.log("[OUTSIDE] Requester accepts proposal: ₹45");
  const { error: acceptError } = await reqClient.rpc('accept_outside_reward', {
    p_request_id: taskId,
    p_amount: 45
  });
  if (acceptError) throw new Error("accept_outside_reward RPC failed: " + acceptError.message);

  ({ data: taskDetails } = await reqClient.from('outside_requests').select('*').eq('id', taskId).single());
  console.log(`[OUTSIDE] Status after accept: ${taskDetails.status} | Reward: ₹${taskDetails.final_reward} (Expect ACCEPTED, Reward 45)`);
  if (taskDetails.status !== 'ACCEPTED' || taskDetails.final_reward !== 45) throw new Error("Negotiation accept failed!");

  // Carrier shares contact details
  console.log("[OUTSIDE] Carrier shares contact information...");
  const { error: shareError } = await carClient.rpc('share_outside_contact', {
    p_request_id: taskId,
    p_contact: 'Phone: +91 9988776655'
  });
  if (shareError) throw new Error("share_outside_contact RPC failed: " + shareError.message);

  // Carrier uploads payment QR details
  console.log("[OUTSIDE] Carrier uploads payment UPI details/QR link...");
  const upiUrl = 'upi://pay?pa=carrier@upi&pn=Carrier&am=45&cu=INR';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
  const { error: qrError } = await carClient.rpc('set_outside_payment_qr', {
    p_request_id: taskId,
    p_qr_url: qrCodeUrl
  });
  if (qrError) throw new Error("set_outside_payment_qr RPC failed: " + qrError.message);

  ({ data: taskDetails } = await reqClient.from('outside_requests').select('*').eq('id', taskId).single());
  console.log(`[OUTSIDE] Status: ${taskDetails.status} | QR: ${taskDetails.payment_qr_url ? "Uploaded" : "None"} (Expect PAYMENT PENDING)`);

  // Requester marks payment as Sent
  console.log("[OUTSIDE] Requester marks payment as Sent...");
  const { error: sentError } = await reqClient.rpc('mark_outside_payment_sent', {
    p_request_id: taskId
  });
  if (sentError) throw new Error("mark_outside_payment_sent RPC failed: " + sentError.message);

  ({ data: taskDetails } = await reqClient.from('outside_requests').select('*').eq('id', taskId).single());
  console.log(`[OUTSIDE] Payment status: ${taskDetails.payment_status} (Expect Sent)`);

  // Carrier confirms payment received
  console.log("[OUTSIDE] Carrier confirms payment receipt...");
  const { error: confirmPayError } = await carClient.rpc('confirm_outside_payment_received', {
    p_request_id: taskId
  });
  if (confirmPayError) throw new Error("confirm_outside_payment_received RPC failed: " + confirmPayError.message);

  ({ data: taskDetails } = await reqClient.from('outside_requests').select('*').eq('id', taskId).single());
  console.log(`[OUTSIDE] Status: ${taskDetails.status} | Payment: ${taskDetails.payment_status} (Expect PAID, Confirmed)`);

  // Carrier starts task
  console.log("[OUTSIDE] Carrier marks task IN PROGRESS...");
  const { error: startError } = await carClient.rpc('start_outside_task', {
    p_request_id: taskId
  });
  if (startError) throw new Error("start_outside_task RPC failed: " + startError.message);

  ({ data: taskDetails } = await reqClient.from('outside_requests').select('*').eq('id', taskId).single());
  console.log(`[OUTSIDE] Status: ${taskDetails.status} (Expect IN PROGRESS)`);

  // Carrier completes task
  console.log("[OUTSIDE] Carrier marks task COMPLETED...");
  const { error: doneError } = await carClient.rpc('complete_outside_task', {
    p_request_id: taskId
  });
  if (doneError) throw new Error("complete_outside_task RPC failed: " + doneError.message);

  ({ data: taskDetails } = await reqClient.from('outside_requests').select('*').eq('id', taskId).single());
  console.log(`[OUTSIDE] Status: ${taskDetails.status} (Expect COMPLETED)`);

  // Carrier marks trip as COMPLETED
  console.log("[TRIPS] Carrier marks trip as COMPLETED...");
  const { error: tripCompleteErr } = await carClient
    .from('outside_trips')
    .update({ status: 'completed' })
    .eq('id', tripId)
    .eq('creator_id', carUser.id);

  if (tripCompleteErr) throw new Error("Failed to complete trip: " + tripCompleteErr.message);
  console.log("✅ Trip successfully completed.");

  console.log("\n🎉 ALL E2E SYSTEM TESTS PASSED SUCCESSFULLY! The integration is fully operational.");
}

runTests().catch(err => {
  console.error("\n❌ E2E System Test failed:", err);
  process.exit(1);
});
