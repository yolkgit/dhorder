'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'authenticated') {
      // 로그인된 사용자는 주문 목록 페이지로 이동
      router.push('/orders');
    } else {
      // 로그인하지 않은 사용자는 로그인 페이지로 이동
      router.push('/login');
    }
  }, [status, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">로딩 중...</h2>
        <p>잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}
