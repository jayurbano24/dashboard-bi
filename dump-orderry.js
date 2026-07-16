require('dotenv').config({ path: '.env.local' });

async function run() {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';
  
  // order_id from the previous debug output: 21755392 (MIRIAN LETICIA PEREZ)
  const orderId = "21755392";
  
  const res = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  
  const data = await res.json();
  console.log("MALFUNCTION:", data.malfunction);
  console.log("DESCRIPTION:", data.description);
  console.log("ENGINEER:", data.engineer);
  console.log("EXECUTOR:", data.executor);
  console.log("MANAGER:", data.manager);
  console.log("CUSTOM FIELDS:", JSON.stringify(data.custom_fields, null, 2));
}

run().catch(console.error);
