import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  const { searchParams } = new URL(request.url);
  const include = searchParams.get('include') || 'operations,materials,parts,products,items';
  
  const res = await fetch(`${baseUrl}/v2/orders?limit=1&include=${include}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  
  const data = await res.json();
  return NextResponse.json(data);
}
