'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, Package, Settings } from 'lucide-react';
import { Button } from './button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      console.log('로그아웃 시도...');
      // 로그아웃 시도
      await signOut({ redirect: false });
      console.log('로그아웃 성공, 리디렉션 중...');
      // 수동으로 리디렉션
      router.push('/login');
      toast.success('로그아웃되었습니다.');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      // 오류가 발생해도 로그인 페이지로 리디렉션
      router.push('/login');
      toast.error('로그아웃 중 오류가 발생했지만, 로그인 페이지로 이동합니다.');
    }
  };
  
  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 shadow-sm sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold text-gray-800 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">주문 관리 시스템</span>
            <span className="sm:hidden">주문관리</span>
          </Link>
          
          {status === 'authenticated' && (
            <nav className="hidden md:flex space-x-4">
              {session.user?.role === 'ADMIN' && (
                <Link href="/admin" className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors flex items-center">
                  <Settings className="h-4 w-4 mr-1" />
                  관리자
                </Link>
              )}
            </nav>
          )}
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {status === 'authenticated' ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:flex items-center text-sm text-gray-700">
                <User className="h-4 w-4 mr-1" />
                <span>
                  {session.user?.name || session.user?.email}
                  {session.user?.role && (
                    <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                      {session.user.role === 'ADMIN' ? '관리자' : '지점'}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex sm:hidden items-center text-sm text-gray-700">
                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  {session.user.role === 'ADMIN' ? '관리자' : '지점'}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center h-10 sm:h-9"
              >
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">로그아웃</span>
              </Button>
            </div>
          ) : status === 'loading' ? (
            <div className="text-sm text-gray-500">로딩 중...</div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="flex items-center h-10 sm:h-9">
                <User className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">로그인</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
} 