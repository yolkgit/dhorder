import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { fetchErpStock } from '@/lib/erpStock';
import { listImageVersions } from '@/lib/itemImages';

export const dynamic = 'force-dynamic';

// 이름 비교용: 대소문자·공백·괄호·하이픈 등을 무시 (생산관리 앱의 품명 연결 규칙과 같음)
const norm = (s: string) => String(s || '').toLowerCase().replace(/[\s()\[\]_\-.]/g, '');

// 재고확인 창에 표시할 제품별 금일재고(생산일보 기준) + 품목 사진 — 본사·관리자(ADMIN)만 조회 가능
// 조회할 때마다 생산관리 앱이 오더를 다시 불러와 최신 출고를 반영한다.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: '본사·관리자만 볼 수 있습니다.' }, { status: 403 });
  }

  try {
    const stock = await fetchErpStock();

    // 생산관리 앱의 제품을 주문 시스템 품목과 이름(별칭 포함)으로 연결해 사진을 붙인다
    const [items, versions] = await Promise.all([
      prisma.item.findMany({ select: { id: true, name: true } }),
      listImageVersions(),
    ]);
    const idByName = new Map<string, string>(items.map((it: { id: string; name: string }) => [norm(it.name), it.id]));

    const withImages = stock.items.map((it) => {
      const itemId = [it.name, ...it.aliases].map((n) => idByName.get(norm(n))).find(Boolean);
      const version = itemId ? versions.get(itemId) : undefined;
      return { ...it, imageUrl: itemId && version ? `/item-image/${itemId}?v=${version}` : null };
    });

    return NextResponse.json({ ok: true, ...stock, items: withImages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[재고] 조회 실패:', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: '재고를 불러오지 못했습니다.' }, { status: 502 });
  }
}
