import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { MAX_IMAGE_BYTES, isJpeg, isValidItemId, removeItemImage, saveItemImage } from '@/lib/itemImages';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

async function checkAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return fail('인증이 필요합니다.', 401);
  if (session.user.role !== 'ADMIN') return fail('관리자만 사용할 수 있습니다.', 403);
  return null;
}

async function checkItem(id: string): Promise<NextResponse | null> {
  if (!isValidItemId(id)) return fail('잘못된 품목입니다.', 400);
  const item = await prisma.item.findUnique({ where: { id }, select: { id: true } });
  if (!item) return fail('품목을 찾을 수 없습니다.', 404);
  return null;
}

// 품목 사진 등록/변경 — 본문은 JPEG 이미지 (브라우저에서 줄여서 보냄)
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const denied = await checkAdmin();
    if (denied) return denied;

    const { id } = await ctx.params;
    const bad = await checkItem(id);
    if (bad) return bad;

    const data = Buffer.from(await req.arrayBuffer());
    if (data.length === 0) return fail('사진이 비어 있습니다.', 400);
    if (data.length > MAX_IMAGE_BYTES) return fail('사진 용량이 너무 큽니다.', 413);
    if (!isJpeg(data)) return fail('JPG 사진만 올릴 수 있습니다.', 400);

    await saveItemImage(id, data);
    console.log('품목 사진 저장:', id, `${Math.round(data.length / 1024)}KB`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('품목 사진 저장 오류:', error);
    return fail('사진을 저장하지 못했습니다.', 500);
  }
}

// 품목 사진 삭제
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const denied = await checkAdmin();
    if (denied) return denied;

    const { id } = await ctx.params;
    if (!isValidItemId(id)) return fail('잘못된 품목입니다.', 400);

    await removeItemImage(id);
    console.log('품목 사진 삭제:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('품목 사진 삭제 오류:', error);
    return fail('사진을 삭제하지 못했습니다.', 500);
  }
}
