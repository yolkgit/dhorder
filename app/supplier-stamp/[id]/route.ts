import { promises as fs } from 'fs';
import { requireAdmin } from '@/lib/adminGuard';
import { isValidSupplierId, stampFile } from '@/lib/supplierStamps';

export const dynamic = 'force-dynamic';

// 공급자 직인 보기 — 본사·관리자만 (도장 이미지는 민감 정보). 주소 끝의 ?v=수정시각 이 바뀌면 새 이미지로 취급하므로 오래 캐시해도 된다.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await requireAdmin();
  if ('denied' in g) return g.denied;

  const { id } = await ctx.params;
  if (!isValidSupplierId(id)) return new Response('Not found', { status: 404 });

  try {
    const data = await fs.readFile(stampFile(id));
    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=31536000, immutable' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
