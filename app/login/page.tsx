'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 세션 상태 확인
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/');
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 입력 검증
    if (!username.trim()) {
      setError('아이디를 입력해주세요.');
      return;
    }
    
    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    console.log('로그인 시도:', { email: username, password });

    try {
      const result = await signIn('credentials', {
        email: username,
        password,
        redirect: false,
      });

      console.log('로그인 결과:', result);

      if (result?.error) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        toast.error('로그인에 실패했습니다.');
      } else {
        toast.success('로그인 성공! 메인 페이지로 이동합니다.');
        
        // 세션 갱신을 위해 페이지 새로고침
        window.location.href = '/';
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다.');
      toast.error('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 테스트 계정 자동 입력
 // const fillTestAccount = (type: 'admin' | 'branch') => {
 //   if (type === 'admin') {
 //     setUsername('admin');
 //     setPassword('admin123');
 //   } else {
 //     setUsername('branch');
 //     setPassword('branch123');
 //   }
 //   setError('');
 // };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">주문 관리 시스템</CardTitle>
          <CardDescription className="text-center">
            계정에 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                아이디
              </label>
              <Input
                id="username"
                type="text"
                placeholder="아이디 입력"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
            

          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-center">
            계정이 없으신가요?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              회원가입
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 