import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { prisma } from '@/lib/prisma';
import { listImageVersions, isValidItemId } from '@/lib/itemImages';
import { listSuppliers } from '@/lib/suppliers';
import { printInfo } from '@/lib/invoiceLog';

export const dynamic = 'force-dynamic';

const MAX_ORDERS = 50;

// 송장(출고지시서) 출력에 필요한 자료: 주문 + 품목별 사진 + 공급자 목록 + 이전 출력 횟수 — 본사·관리자만
export async function GET(req: Request) {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;

  try {
    const raw = new URL(req.url).searchParams.get('ids') || '';
    const ids = Array.from(new Set(raw.split(',').map((s) => s.trim()).filter(Boolean)));
    if (ids.length === 0) return NextResponse.json({ success: false, error: '출력할 주문이 없습니다.' }, { status: 400 });
    if (ids.length > MAX_ORDERS || ids.some((id) => !isValidItemId(id))) {
      return NextResponse.json({ success: false, error: '주문 목록이 올바르지 않습니다.' }, { status: 400 });
    }

    const [orders, items, versions, suppliers, prints] = await Promise.all([
      prisma.order.findMany({
        where: { id: { in: ids } },
        include: { orderItems: true, user: { select: { name: true, branchName: true } } },
      }),
      prisma.item.findMany({ select: { id: true, name: true } }),
      listImageVersions(),
      listSuppliers(),
      printInfo(ids),
    ]);

    // 품목명 → 사진 주소 (주문 품목에는 이름만 저장되어 있으므로 품목 목록과 이름으로 연결)
    const photoByName = new Map<string, string>();
    for (const it of items as { id: string; name: string }[]) {
      const v = versions.get(it.id);
      if (v) photoByName.set(it.name, `/item-image/${it.id}?v=${v}`);
    }

    const byId = new Map((orders as any[]).map((o) => [o.id, o]));
    const result = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((o: any) => {
        const p = prints.get(o.id);
        return {
          id: o.id,
          deliveryDate: new Date(o.deliveryDate).toISOString(),
          arrivalTime: o.arrivalTime || '',
          destination: o.destination || '',
          address: o.address || '',
          phoneNumber: o.phoneNumber || '',
          memo: o.memo || null,
          isWingCarRestricted: !!o.isWingCarRestricted,
          status: o.status,
          branchName: o.user?.branchName || o.user?.name || '',
          contactName: o.user?.name || '',
          items: (o.orderItems as any[])
            .slice()
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((i) => ({ itemName: i.itemName, quantity: i.quantity, imageUrl: photoByName.get(i.itemName) ?? null })),
          printCount: p?.count ?? 0,
          lastPrintedAt: p?.lastAt ?? null,
          lastPrintedBy: p?.lastBy ?? null,
        };
      });

    if (result.length === 0) return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ success: true, orders: result, suppliers });
  } catch (error) {
    console.error('송장 자료 조회 오류:', error);
    return NextResponse.json({ success: false, error: '송장 자료를 불러오지 못했습니다.' }, { status: 500 });
  }
}
