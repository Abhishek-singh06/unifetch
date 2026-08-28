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

  // 1. Fetch requests linked to any of these profile IDs
  console.log("Searching for requests linked to test profiles...");
  const { data: requests } = await supabase
    .from('outside_requests')
    .select('id, requester_id, carrier_id');

  const testRequests = requests ? requests.filter(r => 
    targetProfileIds.includes(r.requester_id) || (r.carrier_id && targetProfileIds.includes(r.carrier_id))
  ) : [];

  const testRequestIds = testRequests.map(r => r.id);

  if (testRequestIds.length > 0) {
    console.log(`Found ${testRequestIds.length} requests linked to test profiles. Deleting messages first...`);
    const { error: msgErr } = await supabase
      .from('outside_messages')
      .delete()
      .in('request_id', testRequestIds);
    if (msgErr) console.error("Error deleting messages:", msgErr.message);

    console.log("Deleting requests...");
    const { error: reqErr } = await supabase
      .from('outside_requests')
      .delete()
      .in('id', testRequestIds);
    if (reqErr) console.error("Error deleting requests:", reqErr.message);
  } else {
    console.log("No requests found.");
  }

  // 2. Fetch and delete trips linked to any of these creator IDs
  console.log("Deleting E2E Outside Trips...");
  const { error: tripErr } = await supabase
    .from('outside_trips')
    .delete()
    .in('creator_id', targetProfileIds);
  if (tripErr) console.error("Error deleting trips:", tripErr.message);

  // 3. Delete Credit Purchases
  console.log("Deleting E2E Credit Purchases...");
  const { error: purErr } = await supabase
    .from('credit_purchases')
    .delete()
    .in('user_id', targetProfileIds);
  if (purErr) console.error("Error deleting purchases:", purErr.message);

  // 4. Delete Profiles
  console.log("Deleting E2E Profiles...");
  const { error: profErr } = await supabase
    .from('profiles')
    .delete()
    .in('id', targetProfileIds);
  if (profErr) {
    console.error("Error deleting profiles:", profErr.message);
  } else {
    console.log("Profiles deleted successfully.");
  }

  console.log("\n✅ Complete database E2E test data cleanup finished.");
}

main();
