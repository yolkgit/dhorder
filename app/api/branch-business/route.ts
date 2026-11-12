import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { prisma } from '@/lib/prisma';
import { isValidItemId } from '@/lib/itemImages';
import { cleanBranchBusiness, getAllBranchBusiness, setBranchBusiness } from '@/lib/branchBusiness';

export const dynamic = 'force-dynamic';

const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

// 지점(회원)별 사업자 정보 전체 (본사·관리자)
export async function GET() {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;
  return NextResponse.json({ success: true, map: await getAllBranchBusiness() });
}

// 한 회원의 사업자 정보 저장 ({ userId, bizName, bizNo, ceo, address, phone }) — 모두 비우면 등록 삭제
export async function PUT(req: Request) {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || '');
    if (!isValidItemId(userId)) return fail('회원 정보가 올바르지 않습니다.', 400);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return fail('회원을 찾을 수 없습니다.', 404);

    const v = cleanBranchBusiness(body);
    if (!v.ok) return fail(v.error, 400);
    await setBranchBusiness(userId, v.empty ? null : v.value);
    return NextResponse.json({ success: true, business: v.empty ? null : v.value });
  } catch (error) {
    console.error('지점 사업자 정보 저장 오류:', error);
    return fail('사업자 정보를 저장하지 못했습니다.', 500);
  }
}
