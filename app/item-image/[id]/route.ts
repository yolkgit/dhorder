import { getServerSession } from 'next-auth';
import { promises as fs } from 'fs';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { imageFile, isValidItemId } from '@/lib/itemImages';

export const dynamic = 'force-dynamic';

// 품목 사진 보기 — 로그인한 사용자만. 주소 끝의 ?v=수정시각 이 바뀌면 새 사진으로 취급하므로 오래 캐시해도 된다.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response('인증이 필요합니다.', { status: 401 });

  const { id } = await ctx.params;
  if (!isValidItemId(id)) return new Response('Not found', { status: 404 });

  try {
    const data = await fs.readFile(imageFile(id));
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
