/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function main() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  const schema = await res.json();
  console.log("Response keys:", Object.keys(schema));
  if (schema.message) {
    console.log("Error message:", schema.message);
  } else {
    console.log("Paths exists:", !!schema.paths);
    if (schema.paths) {
      console.log("Available RPC paths:");
      Object.keys(schema.paths)
        .filter(p => p.startsWith('/rpc/'))
        .forEach(p => console.log(p));
    }
  }
}

main();
