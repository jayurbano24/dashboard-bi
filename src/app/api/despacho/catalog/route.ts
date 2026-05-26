import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 1800; // 30 min

const FALLBACK_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Honor', 'ZTE', 'Tecno', 'Realme', 'TCL', 'Alcatel'];
const FALLBACK_TYPES = ['Smartphone', 'Tablet', 'Router MIFI', 'Smartwatch', 'Modem USB'];

export async function GET() {
  const apiKey = process.env.ORDERRY_API_KEY;
  const baseUrl = process.env.ORDERRY_API_URL || 'https://api.orderry.com';

  if (!apiKey) {
    return NextResponse.json({ brands: FALLBACK_BRANDS, modelsByBrand: {}, productTypes: FALLBACK_TYPES });
  }

  try {
    // Fetch recent orders to extract catalog data
    const res = await fetch(`${baseUrl}/v2/orders?page=1&limit=500`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error(`Orderry HTTP ${res.status}`);

    const data = await res.json();
    const orders: Record<string, any>[] = Array.isArray(data?.data) ? data.data : [];

    const brandSet = new Set<string>();
    const modelsByBrand: Record<string, Set<string>> = {};
    const typeSet = new Set<string>();

    for (const order of orders) {
      const brand: string = (
        order?.asset?.brand?.name ??
        order?.asset?.brand ??
        order?.brand?.name ??
        order?.brand ??
        ''
      ).trim();

      const model: string = (
        order?.asset?.model ??
        order?.asset?.model_name ??
        ''
      ).trim();

      const type: string = (
        order?.asset?.group ??
        order?.asset?.type ??
        order?.asset?.category ??
        ''
      ).trim();

      if (brand) {
        brandSet.add(brand);
        if (model) {
          if (!modelsByBrand[brand]) modelsByBrand[brand] = new Set<string>();
          modelsByBrand[brand].add(model);
        }
      }

      if (type) typeSet.add(type);
    }

    const brands = Array.from(brandSet).sort((a, b) => a.localeCompare(b));
    const modelsByBrandResult: Record<string, string[]> = {};
    for (const [b, mSet] of Object.entries(modelsByBrand)) {
      modelsByBrandResult[b] = Array.from(mSet).sort((a, b) => a.localeCompare(b));
    }
    const productTypes = Array.from(typeSet).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      brands: brands.length ? brands : FALLBACK_BRANDS,
      modelsByBrand: modelsByBrandResult,
      productTypes: productTypes.length ? productTypes : FALLBACK_TYPES,
    });
  } catch {
    return NextResponse.json({
      brands: FALLBACK_BRANDS,
      modelsByBrand: {},
      productTypes: FALLBACK_TYPES,
    });
  }
}
