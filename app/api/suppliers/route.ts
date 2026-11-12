import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import {
  cleanSupplierInput,
  createSupplier,
  deleteSupplier,
  listSuppliers,
  setDefaultSupplier,
  updateSupplier,
} from '@/lib/suppliers';
import { listStampVersions, removeStamp } from '@/lib/supplierStamps';

export const dynamic = 'force-dynamic';

const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

// 공급자 목록 (본사·관리자)
export async function GET() {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;
  const [suppliers, stamps] = await Promise.all([listSuppliers(), listStampVersions()]);
  return NextResponse.json({ success: true, suppliers: suppliers.map((s) => ({ ...s, stampVersion: stamps.get(s.id) ?? null })) });
}

// 공급자 추가
export async function POST(req: Request) {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;
  try {
    const body = await req.json().catch(() => ({}));
    const v = cleanSupplierInput(body);
    if (!v.ok) return fail(v.error, 400);
    const supplier = await createSupplier(v.value);
    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (e) {
    return fail(e instanceof Error ? e.message : '공급자를 저장하지 못했습니다.', 400);
  }
}

// 공급자 수정 / 기본 공급자 지정 ({ id, setDefault: true })
export async function PUT(req: Request) {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || '');
    if (!id) return fail('공급자 ID가 필요합니다.', 400);

    if (body.setDefault === true) {
      return (await setDefaultSupplier(id)) ? NextResponse.json({ success: true }) : fail('공급자를 찾을 수 없습니다.', 404);
    }
    const v = cleanSupplierInput(body);
    if (!v.ok) return fail(v.error, 400);
    const supplier = await updateSupplier(id, v.value);
    return supplier ? NextResponse.json({ success: true, supplier }) : fail('공급자를 찾을 수 없습니다.', 404);
  } catch (e) {
    return fail(e instanceof Error ? e.message : '공급자를 저장하지 못했습니다.', 400);
  }
}

// 공급자 삭제 (?id=)
export async function DELETE(req: Request) {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!id) return fail('공급자 ID가 필요합니다.', 400);
  if (!(await deleteSupplier(id))) return fail('공급자를 찾을 수 없습니다.', 404);
  await removeStamp(id).catch((e: unknown) => console.error('공급자 직인 삭제 실패:', e));
  return NextResponse.json({ success: true });
}
