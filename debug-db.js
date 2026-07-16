const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('despacho_conduce_rows')
    .select('id, imei, order_id, order_name, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    return;
  }

  const emptyRows = data.filter(d => !d.order_name || d.order_name.trim() === '');
  console.log(`Encontrados ${emptyRows.length} vacíos de los últimos 30`);
  emptyRows.slice(0, 5).forEach(r => {
    console.log(`ID: ${r.id}, IMEI: ${r.imei}, OrderID: ${r.order_id}, OrderName: '${r.order_name}'`);
    console.log(`Payload keys: ${Object.keys(r.payload || {})}`);
  });
}
run();
