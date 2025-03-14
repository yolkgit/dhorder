'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    branchName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    // 아이디 유효성 검사 추가
    if (formData.email.includes('@')) {
      setError('아이디에는 @ 기호를 포함할 수 없습니다.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('회원가입 시도:', formData);
      
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role: 'BRANCH', // 기본적으로 지점 사용자로 등록
        }),
      });

      const data = await response.json();
      console.log('회원가입 응답:', data);

      if (!response.ok) {
        throw new Error(data.error || '회원가입 중 오류가 발생했습니다.');
      }

      // 회원가입 성공
      setSuccess(true);
      
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      console.error('회원가입 오류:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">회원가입</CardTitle>
          <CardDescription className="text-center">
            새 계정을 만들어 주문 관리 시스템을 이용하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center py-4">
              <div className="text-green-600 font-bold mb-2">회원가입이 완료되었습니다!</div>
              <div>잠시 후 로그인 페이지로 이동합니다...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  이름
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="이름"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  아이디
                </label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  placeholder="아이디 입력 (영문, 숫자만 사용 가능)"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-gray-500">영문, 숫자로만 구성된 아이디를 입력하세요.</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  비밀번호
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="비밀번호"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="branchName" className="text-sm font-medium">
                  지점명
                </label>
                <Input
                  id="branchName"
                  name="branchName"
                  type="text"
                  placeholder="지점명"
                  value={formData.branchName}
                  onChange={handleChange}
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}
              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? '처리 중...' : '회원가입'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-center">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              로그인
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 