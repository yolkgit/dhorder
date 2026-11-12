import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { isValidItemId } from '@/lib/itemImages';
import { appendPrintLog } from '@/lib/invoiceLog';

export const dynamic = 'force-dynamic';

// 송장 출력 이력 기록 — 인쇄 버튼을 누를 때 호출 (본사·관리자만)
export async function POST(req: Request) {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;

  try {
    const body = await req.json().catch(() => ({}));
    const orderIds: string[] = Array.isArray(body?.orderIds) ? body.orderIds.map(String) : [];
    const supplierId = String(body?.supplierId || '');
    if (orderIds.length === 0 || orderIds.length > 50 || orderIds.some((id) => !isValidItemId(id))) {
      return NextResponse.json({ success: false, error: '주문 목록이 올바르지 않습니다.' }, { status: 400 });
    }
    const by = String(g.session.user?.email || g.session.user?.name || '');
    await appendPrintLog(orderIds, supplierId.slice(0, 40), by);
    console.log('송장 출력 기록:', orderIds.length, '건', by, 'IP:', req.headers.get('x-real-ip') || '-');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('송장 출력 기록 오류:', error);
    return NextResponse.json({ success: false, error: '출력 기록을 남기지 못했습니다.' }, { status: 500 });
  }
}
