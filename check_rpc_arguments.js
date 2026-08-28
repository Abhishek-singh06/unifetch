/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const testUUID = "d3b07384-d113-49c3-a5e2-000000000000";
const testURL = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=test";

const variations = [
  { name: "p_request_id & p_qr_url (our code)", args: { p_request_id: testUUID, p_qr_url: testURL } },
  { name: "p_request_id & p_qr_code_url", args: { p_request_id: testUUID, p_qr_code_url: testURL } },
  { name: "request_id & qr_url", args: { request_id: testUUID, qr_url: testURL } },
  { name: "request_id & qr_code_url", args: { request_id: testUUID, qr_code_url: testURL } },
  { name: "p_request_id & p_qr_code", args: { p_request_id: testUUID, p_qr_code: testURL } }
];

async function main() {
  // Let's sign in a user so we are authenticated
  const email = `probe_test_${Date.now()}@unifetch.com`;
  const password = 'TestPassword123!';
  await supabase.auth.signUp({ email, password });
  await supabase.auth.signInWithPassword({ email, password });

  for (const v of variations) {
    const { data, error } = await supabase.rpc('set_outside_payment_qr', v.args);
    if (error) {
      console.log(`Variation "${v.name}":`);
      console.log(`  Error: ${error.message}`);
    } else {
      console.log(`Variation "${v.name}": SUCCESS!`);
    }
  }
}

main();
