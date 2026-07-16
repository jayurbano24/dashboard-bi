const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('despacho_conduce_rows')
    .select('payload')
    .eq('order_id', '3129227')
    .limit(1);
    
  if (data && data.length > 0) {
    console.log("PAYLOAD KEYS:", Object.keys(data[0].payload));
    console.log("PAYLOAD:", JSON.stringify(data[0].payload, null, 2));
  } else {
    console.log("No data found or order not synced", error);
  }
}
run();
