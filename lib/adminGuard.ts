import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// 본사·관리자(ADMIN)만 통과시키는 공용 검사. 통과하면 { session }, 아니면 그대로 돌려줄 응답 { denied } 를 돌려준다.
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { denied: NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 }) };
  }
  if (session.user.role !== 'ADMIN') {
    return { denied: NextResponse.json({ success: false, error: '본사·관리자만 사용할 수 있습니다.' }, { status: 403 }) };
  }
  return { session };
}
