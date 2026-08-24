import { NextRequest, NextResponse } from 'next/server';
import {
  createSmartCardBox,
  getSmartCardBox,
  listSmartCardBoxes,
  addSmartCardItem,
  listSmartCardItems,
  deleteSmartCardItem,
  getAvailableSmartCardModels,
  getAllSmartCardItemsForReport
} from '@/lib/smartcard-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'models':
        const models = await getAvailableSmartCardModels();
        return NextResponse.json({ ok: true, data: models });
      
      case 'boxes':
        const boxes = await listSmartCardBoxes();
        return NextResponse.json({ ok: true, data: boxes });
      
      case 'box':
        const boxId = searchParams.get('id');
        if (!boxId) return NextResponse.json({ ok: false, error: 'Missing box ID' }, { status: 400 });
        const box = await getSmartCardBox(boxId);
        return NextResponse.json({ ok: true, data: box });

      case 'items':
        const cajaId = searchParams.get('boxId');
        if (!cajaId) return NextResponse.json({ ok: false, error: 'Missing box ID' }, { status: 400 });
        const items = await listSmartCardItems(cajaId);
        return NextResponse.json({ ok: true, data: items });

      case 'report':
        const report = await getAllSmartCardItemsForReport();
        return NextResponse.json({ ok: true, data: report });

      default:
        return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in GET /api/despacho/smartcard:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      case 'createBox':
        const newBox = await createSmartCardBox(payload);
        return NextResponse.json({ ok: true, data: newBox });

      case 'addItem':
        const newItem = await addSmartCardItem(payload);
        return NextResponse.json({ ok: true, data: newItem });

      default:
        return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in POST /api/despacho/smartcard:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ ok: false, error: 'Missing item ID' }, { status: 400 });
    
    await deleteSmartCardItem(id);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/despacho/smartcard:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
