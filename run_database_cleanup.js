/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const targetProfileIds = [
  '76de269c-bcd0-49b1-845a-5d2855f233de',
  '5054d8f5-7b3d-408b-9c9b-2162d0498017',
  '8613e721-6aec-4fa5-86e6-540390c1334e',
  'c889d359-af8e-4aa0-b775-4e206e158d67',
  'd89554ee-7245-4888-9e40-3d699b98456e',
  'a167162b-cb31-4c4c-aba6-3bd5e31d2fc1',
  'bffc902a-2e1a-4b01-8780-ad7776626e62',
  '484315de-9d1f-4afa-a8ae-8dc7c6afc5ad',
  '799ca023-0cc2-4655-bb3b-9baea0c36dc2',
  '525e07e4-74c4-4300-8685-4d7cd5d55098',
  '225274f9-fedf-4247-98af-48c1978822ab',
  'efc3cd56-6e90-4bf0-bc65-d34d1a4526a0',
  'e2d73931-be5e-4cb6-a4e8-37aac4a1ec8d'
];

async function main() {
  console.log("Logging in as Admin...");
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: "abhi7068702757@gmail.com",
    password: "123456"
  });

  if (loginErr) {
    console.error("Admin login failed:", loginErr.message);
    process.exit(1);
  }

  // 1. Delete E2E Trip
  console.log("\nDeleting target E2E Outside Trip...");
  const { data: tripData, error: tripErr, count: tripCount } = await supabase
    .from('outside_trips')
    .delete({ count: 'exact' })
    .eq('id', '9d22b6be-ae72-41e5-b6e8-89b4c3e28843');
  if (tripErr) {
    console.error("Failed to delete trip:", tripErr.message);
  } else {
    console.log(`Deleted trips: ${tripCount} rows.`);
  }

  // 2. Delete Credit Purchases
  console.log("\nDeleting target Credit Purchases...");
  const { data: purData, error: purErr, count: purCount } = await supabase
    .from('credit_purchases')
    .delete({ count: 'exact' })
    .in('id', [
      '63e19f0e-0e8d-40c2-813d-14150c470bd2',
      'c3e0b1d4-96ae-4045-984e-682614bb0dde',
      '6c19f19d-e2ad-42be-834a-3644a80332f1'
    ]);
  if (purErr) {
    console.error("Failed to delete purchases:", purErr.message);
  } else {
    console.log(`Deleted purchases: ${purCount} rows.`);
  }

  // 3. Delete Profiles
  console.log("\nDeleting target Profiles...");
  const { data: profData, error: profErr, count: profCount } = await supabase
    .from('profiles')
    .delete({ count: 'exact' })
    .in('id', targetProfileIds);
  if (profErr) {
    console.error("Failed to delete profiles:", profErr.message);
  } else {
    console.log(`Deleted profiles: ${profCount} rows.`);
  }

  console.log("\n=== POST-CLEANUP VERIFICATIONS ===");
  
  // 1. Verify 13 target profiles are gone
  const { data: checkProfs } = await supabase
    .from('profiles')
    .select('id')
    .in('id', targetProfileIds);
  console.log(`- Remaining target profiles: ${checkProfs ? checkProfs.length : 0} (Expect 0)`);

  // 2. Verify remaining E2E outside trip is gone
  const { data: checkTrips } = await supabase
    .from('outside_trips')
    .select('id')
    .eq('id', '9d22b6be-ae72-41e5-b6e8-89b4c3e28843');
  console.log(`- Remaining E2E outside trips: ${checkTrips ? checkTrips.length : 0} (Expect 0)`);

  // 3. Verify the 3 E2E credit purchases are gone
  const { data: checkPurchases } = await supabase
    .from('credit_purchases')
    .select('id')
    .in('id', [
      '63e19f0e-0e8d-40c2-813d-14150c470bd2',
      'c3e0b1d4-96ae-4045-984e-682614bb0dde',
      '6c19f19d-e2ad-42be-834a-3644a80332f1'
    ]);
  console.log(`- Remaining E2E purchases: ${checkPurchases ? checkPurchases.length : 0} (Expect 0)`);

  // 4. Verify outside_requests count for targets is 0
  const { data: checkReqs } = await supabase
    .from('outside_requests')
    .select('id')
    .in('requester_id', targetProfileIds);
  console.log(`- Remaining E2E requests: ${checkReqs ? checkReqs.length : 0} (Expect 0)`);

  // 5. Verify package_requests count for targets is 0
  const { data: checkPkgReqs } = await supabase
    .from('package_requests')
    .select('id')
    .in('requester_id', targetProfileIds);
  console.log(`- Remaining E2E inside requests: ${checkPkgReqs ? checkPkgReqs.length : 0} (Expect 0)`);

  // 6. Verify real admin profile still exists
  const { data: adminCheck, error: admCheckErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', 'a0685c1b-cbe0-4480-ac95-489674ac5260')
    .single();

  if (admCheckErr) {
    console.error("❌ Real admin checks FAILED:", admCheckErr.message);
  } else {
    console.log(`✅ Real admin aarav (${adminCheck.email}) exists and is untouched!`);
  }
}

main();
