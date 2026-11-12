import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { listSuppliers } from '@/lib/suppliers';
import { MAX_STAMP_BYTES, isPng, isValidSupplierId, removeStamp, saveStamp } from '@/lib/supplierStamps';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

// 공급자 직인(법인 도장) 등록/변경 — 본문은 PNG 이미지 (브라우저에서 줄여서 보냄)
export async function PUT(req: Request, ctx: Ctx) {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;
  try {
    const { id } = await ctx.params;
    if (!isValidSupplierId(id)) return fail('잘못된 공급자입니다.', 400);
    if (!(await listSuppliers()).some((s) => s.id === id)) return fail('공급자를 찾을 수 없습니다.', 404);

    const data = Buffer.from(await req.arrayBuffer());
    if (data.length === 0) return fail('직인 이미지가 비어 있습니다.', 400);
    if (data.length > MAX_STAMP_BYTES) return fail('직인 이미지 용량이 너무 큽니다.', 413);
    if (!isPng(data)) return fail('PNG 이미지만 올릴 수 있습니다.', 400);

    await saveStamp(id, data);
    console.log('공급자 직인 저장:', id, `${Math.round(data.length / 1024)}KB`, '요청자:', g.session.user?.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('공급자 직인 저장 오류:', error);
    return fail('직인을 저장하지 못했습니다.', 500);
  }
}

// 공급자 직인 삭제
export async function DELETE(_req: Request, ctx: Ctx) {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;
  try {
    const { id } = await ctx.params;
    if (!isValidSupplierId(id)) return fail('잘못된 공급자입니다.', 400);
    await removeStamp(id);
    console.log('공급자 직인 삭제:', id, '요청자:', g.session.user?.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('공급자 직인 삭제 오류:', error);
    return fail('직인을 삭제하지 못했습니다.', 500);
  }
}
