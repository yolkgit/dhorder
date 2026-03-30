'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Edit, Trash2, Eye, Calendar, Truck } from 'lucide-react';
import Link from 'next/link';
import { CalendarIcon, ListIcon, PlusIcon } from 'lucide-react';
import { FilterIcon } from 'lucide-react';
import { DownloadIcon } from 'lucide-react';
import { ChevronDown, ChevronUp, Table as TableIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// 주문 상태 표시 컴포넌트
const OrderStatusBadge = ({ status, isAdmin, orderId, onStatusChange }: { status: string; isAdmin: boolean; orderId: string; onStatusChange?: (id: string, status: string) => void }) => {
  // 타임스탬프를 활용한 강제 갱신 처리
  const [localStatus, setLocalStatus] = useState(status);
  
  // props 변경 시 로컬 상태 갱신
  useEffect(() => {
    setLocalStatus(status);
  }, [status]);
  
  // 상태별 색상 및 스타일 설정
  let iconColor = 'text-gray-500';
  let bgColor = 'bg-gray-100';
  let hoverClass = '';
  
  if (localStatus === 'RECEIVED') {
    iconColor = 'text-gray-500';
    bgColor = 'bg-gray-100';
  } else if (localStatus === 'DISPATCHED') {
    iconColor = 'text-blue-500';
    bgColor = 'bg-blue-100';
  } else if (localStatus === 'DELIVERED') {
    iconColor = 'text-red-500';
    bgColor = 'bg-red-100';
  }

  // 관리자인 경우 호버 효과 및 커서 스타일 추가
  if (isAdmin) {
    hoverClass = 'hover:scale-110 cursor-pointer transition-transform';
  }

  // 관리자 클릭 핸들러
  const handleClick = () => {
    if (isAdmin && onStatusChange) {
      // 상태 순환: RECEIVED -> DISPATCHED -> DELIVERED -> RECEIVED
      const nextStatus = {
        'RECEIVED': 'DISPATCHED',
        'DISPATCHED': 'DELIVERED',
        'DELIVERED': 'RECEIVED'
      }[localStatus] || 'RECEIVED';
      
      // 클라이언트 측 상태 먼저 갱신 (즉각적 피드백)
      setLocalStatus(nextStatus);
      
      // API 호출
      onStatusChange(orderId, nextStatus);
    }
  };

  // 상태 텍스트 (툴팁용)
  const statusText = {
    RECEIVED: '주문접수',
    DISPATCHED: '차량배차',
    DELIVERED: '배송완료',
  }[localStatus] || localStatus;

  return (
    <div 
      key={`${orderId}-${localStatus}-${Date.now()}`}
      className={`flex justify-center items-center p-1.5 rounded-full ${bgColor} ${hoverClass}`} 
      title={statusText} 
      onClick={handleClick}
      data-order-id={orderId}
      data-status={localStatus}
    >
      <Truck className={`h-5 w-5 ${iconColor}`} />
    </div>
  );
};

// 주문 항목 목록 컴포넌트
const OrderItemsList = ({ items }: { items: any[] }) => {
  return (
    <ul className="list-none p-0 m-0">
      {items.map((item, index) => (
        <li key={index} className="mb-0.5">
          {item.itemName}
        </li>
      ))}
    </ul>
  );
};

// 주문 상세 정보 다이얼로그 컴포넌트
const OrderDetailsDialog = ({ order, onDelete, isObserver, session }: { order: any, onDelete: (id: string) => Promise<void>, isObserver: boolean, session: any }) => {
  // 주문 생성 시간을 초까지 포맷팅하는 함수
  const formatCreatedAt = (dateString: string) => {
    if (!dateString) return '정보 없음';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="px-0 mx-0">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>주문 상세 정보</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500">주문일시</p>
              <p>{formatCreatedAt(order.createdAt)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">상태</p>
              <div className="flex items-center mt-1">
                <OrderStatusBadge status={order.status} isAdmin={false} orderId={order.id} />
                <span className="ml-2">
                  {order.status === 'RECEIVED' ? '주문접수' : 
                   order.status === 'DISPATCHED' ? '차량배차' : 
                   order.status === 'DELIVERED' ? '배송완료' : order.status}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">납품일자</p>
              <p>{new Date(order.deliveryDate).toLocaleDateString()}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">도착시간</p>
              <p>{order.arrivalTime || '정보 없음'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">하차지</p>
              <p>{order.destination || '정보 없음'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">전화번호</p>
              <p>{order.phoneNumber || '정보 없음'}</p>
            </div>
            
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500">주소</p>
              <p>{order.address || '정보 없음'}</p>
            </div>
            
            {order.memo && (
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">메모</p>
                <p>{order.memo}</p>
              </div>
            )}
            
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500 mb-2">주문 항목</p>
              <div className="border rounded-md p-3 bg-gray-50">
                {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left pb-2 font-medium">품목</th>
                        <th className="text-right pb-2 font-medium">수량</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item: any, idx: number) => (
                        <tr key={idx} className={idx !== order.items.length - 1 ? "border-b" : ""}>
                          <td className="py-2">{item.itemName}</td>
                          <td className="py-2 text-right font-medium">{item.quantity}개</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500">주문 항목이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4 flex justify-between">
          <div className="flex gap-2">
            {(order.status === 'RECEIVED' || session?.user?.role === 'ADMIN') && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orders/${order.id}/edit`} className="flex items-center">
                    <Edit className="h-4 w-4 mr-1" />
                    수정
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(order.id)}
                  className="flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 정렬 방향 표시 아이콘 컴포넌트
const SortIcon = ({ field, currentField, direction }: { field: string, currentField: string, direction: 'asc' | 'desc' | 'createdAt' }) => {
  if (field !== currentField) return null;
  
  return (
    <span className="ml-1 inline-block">
      {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '-'}
    </span>
  );
};

// 주문 분석 테이블 컴포넌트
const OrderAnalyticsTable = ({ orders }: { orders: any[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 데이터 집계 및 구조화
  const { monthlyData, months, branchData } = useMemo(() => {
    // 월별 데이터 초기화
    const monthlyData: { [key: string]: any } = {};
    const months = new Set<string>();
    const branchData: {
      [branch: string]: {
        items: { [item: string]: { [month: string]: number } },
        totals: { [month: string]: number }
      }
    } = {};

    // 데이터 집계
    orders.forEach(order => {
      const date = new Date(order.deliveryDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);

      const branchName = order.user?.branchName || order.user?.name || '미지정';
      
      // 지점 데이터 초기화
      if (!branchData[branchName]) {
        branchData[branchName] = {
          items: {},
          totals: {}
        };
      }

      // 품목별 집계
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const quantity = item.quantity || 0;
          
          // 품목 데이터 초기화
          if (!branchData[branchName].items[item.itemName]) {
            branchData[branchName].items[item.itemName] = {};
          }
          
          // 월별 수량 누적
          branchData[branchName].items[item.itemName][monthKey] = 
            (branchData[branchName].items[item.itemName][monthKey] || 0) + quantity;
          
          // 지점 월별 총계 누적
          branchData[branchName].totals[monthKey] = 
            (branchData[branchName].totals[monthKey] || 0) + quantity;
        });
      }
    });

    // 월 배열 정렬
    const sortedMonths = Array.from(months).sort();

    return {
      monthlyData,
      months: sortedMonths,
      branchData
    };
  }, [orders]);

  // 총계 계산
  const totals = useMemo(() => {
    const monthTotals: { [month: string]: number } = {};
    const branchTotals: { [branch: string]: number } = {};
    let grandTotal = 0;

    Object.entries(branchData).forEach(([branch, data]) => {
      Object.entries(data.totals).forEach(([month, total]) => {
        monthTotals[month] = (monthTotals[month] || 0) + total;
        branchTotals[branch] = (branchTotals[branch] || 0) + total;
        grandTotal += total;
      });
    });

    return { monthTotals, branchTotals, grandTotal };
  }, [branchData]);

  return (
    <Card className="mb-4">
      <CardHeader className="py-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center">
            <TableIcon className="mr-1.5 h-4 w-4" />
            주문 집계 현황
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold">지점/품목</TableHead>
                  {months.map(month => (
                    <TableHead key={month} className="text-right font-bold">
                      {month}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold">합계</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* 전체 합계 행 */}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell>총계</TableCell>
                  {months.map(month => (
                    <TableCell key={month} className="text-right">
                      {totals.monthTotals[month]?.toLocaleString() || 0}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {totals.grandTotal.toLocaleString()}
                  </TableCell>
                </TableRow>

                {/* 지점별 데이터 */}
                {Object.entries(branchData).map(([branch, data], index) => (
                  <React.Fragment key={branch}>
                    {/* 지점 합계 행 */}
                    <TableRow className="bg-gray-50">
                      <TableCell className="font-semibold">{branch}</TableCell>
                      {months.map(month => (
                        <TableCell key={month} className="text-right font-semibold">
                          {data.totals[month]?.toLocaleString() || 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">
                        {totals.branchTotals[branch]?.toLocaleString() || 0}
                      </TableCell>
                    </TableRow>

                    {/* 품목별 상세 행 */}
                    {Object.entries(data.items).map(([item, quantities]) => (
                      <TableRow key={`${branch}-${item}`}>
                        <TableCell className="pl-8">{item}</TableCell>
                        {months.map(month => (
                          <TableCell key={month} className="text-right">
                            {quantities[month]?.toLocaleString() || 0}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTodayLoading, setIsTodayLoading] = useState(false);
  
  // localStorage에서 필터 설정 불러오기
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (typeof window !== 'undefined') {
      const savedMonth = localStorage.getItem('selectedMonth');
      const savedTimestamp = localStorage.getItem('monthSelectionTimestamp');
      
      // 저장된 선택 시간이 1시간 이상 지났는지 확인
      if (savedMonth && savedTimestamp) {
        const elapsedTime = Date.now() - parseInt(savedTimestamp);
        const oneHour = 60 * 60 * 1000; // 1시간을 밀리초로 변환
        
        // 1시간이 지나지 않았다면 저장된 월을 사용
        if (elapsedTime < oneHour) {
          return savedMonth;
        }
      }
    }
    return currentMonth;
  });

  // 현재 월을 메모이제이션
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  
  // 초기값은 localStorage에서 불러오거나 기본값으로 true 설정
  const [showAllOrders, setShowAllOrders] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedShowAllOrders = localStorage.getItem('showAllOrders');
      return savedShowAllOrders !== null ? savedShowAllOrders === 'true' : true;
    }
    return true;
  });
  
  // 시작일 localStorage에서 불러오기
  const [startDate, setStartDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedStartDate = localStorage.getItem('startDate');
      if (savedStartDate) return savedStartDate;
    }
    
    // 오늘이 속한 월의 1일을 시작일로 설정
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  });
  
  const [endDate, setEndDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedEndDate = localStorage.getItem('endDate');
      return savedEndDate || '';
    }
    return ''; // 빈 문자열은 "이후의 모든 주문"을 의미
  });

  // 정렬 관련 상태 추가 (localStorage에서 불러오기)
  const [sortField, setSortField] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedSortField = localStorage.getItem('sortField');
      return savedSortField || 'deliveryDate';
    }
    return 'deliveryDate';
  });
  
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'createdAt'>('desc');

  // 금일주문상태 컨테이너용 정렬 상태
  const [todayOrdersSortField, setTodayOrdersSortField] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedField = localStorage.getItem('todayOrdersSortField');
      return savedField || 'createdAt';
    }
    return 'createdAt';
  });
  
  const [todayOrdersSortDirection, setTodayOrdersSortDirection] = useState<'asc' | 'desc' | 'createdAt'>(() => {
    if (typeof window !== 'undefined') {
      const savedDirection = localStorage.getItem('todayOrdersSortDirection');
      return (savedDirection === 'asc' || savedDirection === 'desc' || savedDirection === 'createdAt')
        ? savedDirection as 'asc' | 'desc' | 'createdAt'
        : 'desc';
    }
    return 'desc';
  });

  // 참조 변수들 정의
  const isFirstRender = useRef(true);
  const isInitialDataLoadedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const todayControllerRef = useRef<AbortController | null>(null);

  // 인증 상태 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error('로그인이 필요합니다.');
      router.push('/login');
    }
  }, [status, router]);

  // 오늘 날짜 메모이제이션
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // 오늘 이후 주문 필터링
  const currentAndFutureOrders = useMemo(() => 
    todayOrders.filter(order => {
      const deliveryDate = new Date(order.deliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate.getTime() >= today.getTime();
    }), [todayOrders, today]);

  // 정렬된 주문 목록 계산
  const sortedOrders = useMemo(() => {
    if (!orders.length) return [];
    
    return [...orders].sort((a, b) => {
      if (sortField === 'deliveryDate') {
        if (sortDirection === 'createdAt') {
          // 주문일시 기준 정렬
          const createdAtA = new Date(a.createdAt || 0).getTime();
          const createdAtB = new Date(b.createdAt || 0).getTime();
          return createdAtB - createdAtA; // 항상 내림차순
        } else {
          // 납품일자 기준 정렬
          const dateA = new Date(a.deliveryDate).getTime();
          const dateB = new Date(b.deliveryDate).getTime();
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }
      } else if (sortField === 'status') {
        // 배차상태 기준 정렬
        return sortDirection === 'asc' 
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      } else if (sortField === 'branchName') {
        // 지점명 기준 정렬
        const branchNameA = a.user?.branchName || a.user?.name || '';
        const branchNameB = b.user?.branchName || b.user?.name || '';
        return sortDirection === 'asc'
          ? branchNameA.localeCompare(branchNameB)
          : branchNameB.localeCompare(branchNameA);
      }
      return 0;
    });
  }, [orders, sortField, sortDirection]);

  // 정렬된 오늘 이후 주문 목록 계산
  const sortedCurrentAndFutureOrders = useMemo(() => {
    if (!currentAndFutureOrders.length) return [];
    
    return [...currentAndFutureOrders].sort((a, b) => {
      if (todayOrdersSortField === 'deliveryDate') {
        if (todayOrdersSortDirection === 'createdAt') {
          // 주문일시 기준 정렬
          const createdAtA = new Date(a.createdAt || 0).getTime();
          const createdAtB = new Date(b.createdAt || 0).getTime();
          return createdAtB - createdAtA; // 항상 내림차순
        } else {
          // 납품일자 기준 정렬
          const dateA = new Date(a.deliveryDate).getTime();
          const dateB = new Date(b.deliveryDate).getTime();
          return todayOrdersSortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }
      } else if (todayOrdersSortField === 'status') {
        // 배차상태 기준 정렬
        return todayOrdersSortDirection === 'asc' 
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      } else if (todayOrdersSortField === 'branchName') {
        // 지점명 기준 정렬
        const branchNameA = a.user?.branchName || a.user?.name || '';
        const branchNameB = b.user?.branchName || b.user?.name || '';
        return todayOrdersSortDirection === 'asc'
          ? branchNameA.localeCompare(branchNameB)
          : branchNameB.localeCompare(branchNameA);
      } else if (todayOrdersSortField === 'createdAt') {
        // 주문일시 기준 정렬
        const createdAtA = new Date(a.createdAt || 0).getTime();
        const createdAtB = new Date(b.createdAt || 0).getTime();
        return todayOrdersSortDirection === 'asc' ? createdAtA - createdAtB : createdAtB - createdAtA;
      }
      return 0;
    });
  }, [currentAndFutureOrders, todayOrdersSortField, todayOrdersSortDirection]);

  // 오늘 이후 주문 데이터 불러오기 (별도 함수)
  const fetchTodayOrders = useCallback(async (forceTimestamp?: number) => {
    // 이전 요청 취소
    if (todayControllerRef.current) {
      todayControllerRef.current.abort();
    }

    setIsTodayLoading(true);
    
    // 새 요청을 위한 컨트롤러
    const controller = new AbortController();
    todayControllerRef.current = controller;

    try {
      // 캐시 방지용 타임스탬프
      const timestamp = forceTimestamp || new Date().getTime();
      console.log(`오늘 이후 주문 요청 (${timestamp})`);
      
      // 캐시 무효화 헤더를 포함한 요청
      const response = await fetch(`/api/orders?showAll=true&t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        throw new Error(`오늘 주문 API 오류: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`오늘 주문 응답 (${timestamp}):`, data);
      
      if (data?.success && Array.isArray(data.orders)) {
        console.log(`오늘 주문 ${data.orders.length}개 로드됨`);
        setTodayOrders(data.orders);
      } else {
        console.error('오늘 주문 응답 형식 오류:', data);
        setTodayOrders([]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('오늘 주문 요청 취소됨');
      } else {
        console.error('오늘 주문 로드 오류:', error);
        toast.error(`오늘 주문 데이터를 가져오는 중 오류가 발생했습니다.`);
      }
      setTodayOrders([]);
    } finally {
      setIsTodayLoading(false);
      todayControllerRef.current = null;
    }
  }, []);

  // 필터링된 주문 목록 불러오기
  const fetchOrders = useCallback(async (month: string, showAll: boolean, forceTimestamp?: number) => {
    // 기존 요청 취소
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    // 로딩 상태 설정
    setIsLoading(true);
    
    // 새 요청을 위한 컨트롤러
    const controller = new AbortController();
    controllerRef.current = controller;
    
    try {
      // 캐시 방지용 타임스탬프
      const timestamp = forceTimestamp || new Date().getTime();
      
      // URL 구성
      let url = '';
      
      // 연도별 전체 주문 보기
      if (showAll) {
        // 시작 날짜가 있는 경우, 시작 날짜부터 이후의 모든 주문 조회
        if (startDate) {
          const startMonth = startDate.substring(0, 7); // YYYY-MM 형식 추출
          url = `/api/orders?month=${startMonth}&startDate=${startDate}&showAll=true&t=${timestamp}`;
          console.log(`${startDate} 이후 모든 주문 요청: ${url}`);
        } else {
          // 선택된 년도의 전체 주문 조회
          const selectedYear = month.split('-')[0];
          const yearMonth = `${selectedYear}-01`; // 해당 연도의 1월
          url = `/api/orders?month=${yearMonth}&showAll=true&t=${timestamp}`;
          console.log(`${selectedYear}년 전체 주문 요청: ${url}`);
        }
      } else {
        // 선택된 월의 주문만 조회
        url = `/api/orders?month=${month}&showAll=false&t=${timestamp}`;
        console.log(`${month} 월 주문 요청: ${url}`);
      }
      
      // 캐시 무효화 헤더를 포함한 요청
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`주문 목록 응답 (${timestamp}):`, data);
      
      // 응답 데이터 처리
      if (data?.success && Array.isArray(data.orders)) {
        console.log(`주문 ${data.orders.length}개 로드됨 (타임스탬프: ${timestamp})`);
          setOrders(data.orders);
        } else {
        console.error('응답 형식 오류:', data);
        setOrders([]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('주문 요청 취소됨');
      } else {
        console.error('주문 로드 오류:', error);
        toast.error(`주문 목록을 가져오는 중 오류가 발생했습니다.`);
      }
      setOrders([]);
    } finally {
      setIsLoading(false);
      controllerRef.current = null;
    }
  }, [startDate]);

  // 전체 주문 보기 토글 핸들러
  const handleToggleAllOrders = useCallback(() => {
    const newShowAllOrders = !showAllOrders;
    setShowAllOrders(newShowAllOrders);
    
    if (newShowAllOrders) {
      // 현재 월 이후의 모든 주문 보기
      const currentMonth = selectedMonth;
      const firstDayOfMonth = `${currentMonth}-01`;
      setStartDate(firstDayOfMonth);
      setEndDate(''); // 빈 문자열은 "이후 모든 주문"을 의미
      
      // localStorage에 저장
      localStorage.setItem('showAllOrders', 'true');
      localStorage.setItem('startDate', firstDayOfMonth);
      localStorage.setItem('endDate', '');
      
      toast.success(`${currentMonth.slice(0, 4)}년 ${currentMonth.slice(5, 7)}월 이후 모든 주문을 표시합니다.`);
    } else {
      // 선택된 월의 주문만 보기
      // localStorage에 저장
      localStorage.setItem('showAllOrders', 'false');
      
      toast.success(`${selectedMonth.slice(0, 4)}년 ${selectedMonth.slice(5, 7)}월 주문만 표시합니다.`);
    }
    
    // 토글 후 즉시 데이터 로드
    fetchOrders(selectedMonth, newShowAllOrders);
  }, [fetchOrders, selectedMonth, showAllOrders]);

  // 월 변경 핸들러
  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    
    // localStorage에 선택한 월과 타임스탬프 저장
    localStorage.setItem('selectedMonth', newMonth);
    localStorage.setItem('monthSelectionTimestamp', Date.now().toString());
    
    if (showAllOrders) {
      // 전체 보기 모드에서 월이 변경되면 해당 월 이후의 모든 주문으로 변경
      const firstDayOfMonth = `${newMonth}-01`;
      setStartDate(firstDayOfMonth);
      setEndDate('');
      
      // localStorage에 저장
      localStorage.setItem('startDate', firstDayOfMonth);
      localStorage.setItem('endDate', '');
      
      toast.success(`${newMonth.slice(0, 4)}년 ${newMonth.slice(5, 7)}월 이후 모든 주문을 표시합니다.`);
    } else {
      // 월별 주문 모드에서는 선택된 월의 주문만 표시
      toast.success(`${newMonth.slice(0, 4)}년 ${newMonth.slice(5, 7)}월 주문을 표시합니다.`);
    }
    
    // 월 변경 시 즉시 데이터 로드
    fetchOrders(newMonth, showAllOrders);
  }, [fetchOrders, showAllOrders]);

  // 자동 리셋 타이머 설정
  useEffect(() => {
    // 현재 월이 아닌 경우에만 타이머 설정
    if (selectedMonth !== currentMonth) {
      const checkResetInterval = setInterval(() => {
        const savedTimestamp = localStorage.getItem('monthSelectionTimestamp');
        
        if (savedTimestamp) {
          const elapsedTime = Date.now() - parseInt(savedTimestamp);
          const oneHour = 60 * 60 * 1000; // 1시간을 밀리초로 변환
          
          // 1시간이 지났으면 현재 월로 리셋
          if (elapsedTime >= oneHour) {
            setSelectedMonth(currentMonth);
            localStorage.setItem('selectedMonth', currentMonth);
            localStorage.removeItem('monthSelectionTimestamp');
            
            // 데이터 다시 로드
            fetchOrders(currentMonth, showAllOrders);
            
            toast.info('1시간이 경과하여 현재 월로 되돌아갑니다.');
          }
        }
      }, 60000); // 1분마다 체크
      
      return () => clearInterval(checkResetInterval);
    }
  }, [selectedMonth, currentMonth, fetchOrders, showAllOrders]);

  // 주문 삭제 핸들러
  const handleDeleteOrder = useCallback(async (orderId: string) => {
    if (!confirm('정말로 이 주문을 삭제하시겠습니까?')) {
      return;
    }

    try {
      toast.loading('주문을 삭제하는 중...');
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '주문 삭제 중 오류가 발생했습니다.');
      }

      toast.dismiss();
      toast.success('주문이 삭제되었습니다.');
      
      // 삭제 후 데이터 다시 불러오기 (두 목록 모두 새로고침)
      fetchOrders(selectedMonth, showAllOrders);
      fetchTodayOrders();
    } catch (error) {
      toast.dismiss();
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('주문 삭제 중 오류가 발생했습니다.');
      }
    }
  }, [fetchOrders, fetchTodayOrders, selectedMonth, showAllOrders]);

  // 주문 상태 변경 핸들러
  const handleChangeStatus = useCallback(async (orderId: string, newStatus: string) => {
    try {
      console.log(`주문 상태 변경 요청: ${orderId} -> ${newStatus}`);
      
      // 상태 변경 중임을 표시
      toast.loading('상태 변경 중...', { id: 'statusChange' });
      
      // 즉시 UI 업데이트 (낙관적 업데이트)를 위한 State 변경
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? {...order, status: newStatus} : order
        )
      );
      
      setTodayOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? {...order, status: newStatus} : order
        )
      );
      
      // 실시간 캐시 방지를 위한 타임스탬프
      const timestamp = new Date().getTime();
      
      // API 호출 (캐시 무효화 처리 강화)
      const response = await fetch(`/api/orders/${orderId}/status?t=${timestamp}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: JSON.stringify({ 
          status: newStatus,
          timestamp: timestamp // 서버에 타임스탬프 전달
        }),
        cache: 'no-store'
      });
      
      // 응답 처리 및 에러 핸들링
        const data = await response.json();
      console.log(`API 응답 (${timestamp}):`, data);
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || '상태 변경 중 오류가 발생했습니다.');
      }

      // 성공 메시지
      toast.dismiss('statusChange');
      toast.success('주문 상태가 변경되었습니다.');
      
      // 서버에서 최신 데이터 가져오기
      setTimeout(() => {
        const newTimestamp = new Date().getTime();
        console.log('상태 변경 후 데이터 새로고침:', newTimestamp);
        fetchOrders(selectedMonth, showAllOrders, newTimestamp);
        fetchTodayOrders(newTimestamp);
      }, 500);
      
    } catch (error) {
      console.error('상태 변경 오류:', error);
      toast.dismiss('statusChange');
      
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('상태 변경 중 오류가 발생했습니다.');
      }
      
      // 오류 발생 시 데이터 다시 로드 (원상태로 복구)
      fetchOrders(selectedMonth, showAllOrders);
      fetchTodayOrders();
    }
  }, [fetchOrders, fetchTodayOrders, selectedMonth, showAllOrders]);

  // 엑셀 다운로드 함수
  const handleExportToExcel = useCallback(() => {
    try {
      // 로딩 중이거나 주문이 없는 경우 처리
      if (isLoading || orders.length === 0) {
        toast.error('내보낼 주문 데이터가 없습니다.');
        return;
      }

      // 현재 필터링된 주문 목록 사용
      const dataToExport = orders;
      
      // 날짜별 카운터 객체 생성 (같은 날짜 처리용)
      const dateCounters: { [key: string]: number } = {};
      
      // 엑셀 데이터 준비
      const excelData: any[] = [];
      
      // 각 주문을 처리
      dataToExport.forEach((order, index) => {
        // 날짜 형식 변환 (YYYY-MM-DD)
        const deliveryDate = new Date(order.deliveryDate);
        const formattedDate = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}-${String(deliveryDate.getDate()).padStart(2, '0')}`;
        
        // 날짜 카운터 처리
        if (!dateCounters[formattedDate]) {
          dateCounters[formattedDate] = 1;
        }
        const dateCounter = dateCounters[formattedDate];
        dateCounters[formattedDate]++;
        
        // 최종 날짜 형식 (YYYY-MM-DD-XX)
        const finalDateFormat = `${formattedDate}-${String(dateCounter).padStart(2, '0')}`;
        
        // 주문 항목이 있는지 확인
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          // 주문 항목이 여러 개인 경우 첫 번째 항목에만 주문 정보를 포함
          order.items.forEach((item: any, itemIndex: number) => {
            const row: any = {};
            
            // 첫 번째 항목인 경우만 주문 정보 포함
            if (itemIndex === 0) {
              row['주문번호'] = index + 1;
              row['납품일자'] = new Date(order.deliveryDate).toLocaleDateString();
              row['지점명'] = order.user?.branchName || order.user?.name || '';
              row['하차지'] = order.destination || '';
              row['메모'] = order.memo || '';
              row['주문일시'] = order.createdAt ? new Date(order.createdAt).toLocaleString() : '';
              row['도착시간'] = order.arrivalTime || '';
              row['전화번호'] = order.phoneNumber || '';
            } else {
              // 첫 번째가 아닌 경우 빈 문자열로 채움
              row['주문번호'] = '';
              row['납품일자'] = '';
              row['지점명'] = '';
              row['하차지'] = '';
              row['메모'] = '';
              row['주문일시'] = '';
              row['도착시간'] = '';
              row['전화번호'] = '';
            }
            
            // 항목 정보 추가
            row['품목'] = item.itemName || '';
            row['수량'] = item.quantity || 0;
            
            excelData.push(row);
          });
        } else {
          // 주문 항목이 없는 경우에도 기본 정보만 포함
          const row: any = {
            '주문번호': index + 1,
            '납품일자': new Date(order.deliveryDate).toLocaleDateString(),
            '지점명': order.user?.branchName || order.user?.name || '',
            '하차지': order.destination || '',
            '메모': order.memo || '',
            '주문일시': order.createdAt ? new Date(order.createdAt).toLocaleString() : '',
            '도착시간': order.arrivalTime || '',
            '전화번호': order.phoneNumber || '',
            '품목': '항목 없음',
            '수량': 0
          };
          
          excelData.push(row);
        }
      });
      
      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // 셀 병합 정보 설정
      const merges: XLSX.Range[] = [];
      
      // 병합할 셀 범위 계산
      let startRow = 1; // 헤더 행 다음부터 시작
      dataToExport.forEach(order => {
        if (order.items && Array.isArray(order.items) && order.items.length > 1) {
          // 여러 항목이 있는 경우 병합 범위 설정
          const endRow = startRow + order.items.length - 1;
          
          // 품목과 수량을 제외한 모든 열 병합
          ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
            merges.push({
              s: { r: startRow, c: col.charCodeAt(0) - 65 },
              e: { r: endRow, c: col.charCodeAt(0) - 65 }
            });
          });
          
          startRow = endRow + 1;
        } else {
          // 항목이 하나이거나 없는 경우 다음 행으로
          startRow += 1;
        }
      });
      
      // 병합 정보 워크시트에 적용
      worksheet['!merges'] = merges;
      
      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '주문 목록');
      
      // 파일명 설정
      const fileName = showAllOrders 
        ? `${selectedMonth.split('-')[0]}년_전체_주문목록.xlsx` 
        : `${selectedMonth.slice(0, 4)}년_${selectedMonth.slice(5, 7)}월_주문_목록.xlsx`;
      
      // 엑셀 파일 생성 및 다운로드
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, fileName);
      
      toast.success('주문 목록이 엑셀 파일로 저장되었습니다.');
    } catch (error) {
      console.error('엑셀 내보내기 오류:', error);
      toast.error('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  }, [isLoading, orders, selectedMonth, showAllOrders]);

  // 정렬 방향 토글 함수
  const handleSort = useCallback((field: string) => {
    if (field === sortField) {
      // 같은 필드를 다시 클릭한 경우, 정렬 상태 순환
      let newDirection: 'asc' | 'desc' | 'createdAt';
      
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = 'createdAt';
      } else {
        newDirection = 'asc';
      }
      
      setSortDirection(newDirection);
      // localStorage에 저장
      localStorage.setItem('sortDirection', newDirection);
    } else {
      // 다른 필드를 클릭한 경우, 해당 필드로 변경하고 기본 정렬 방향 설정
      setSortField(field);
      setSortDirection('asc'); // 기본 정렬 방향
      // localStorage에 저장
      localStorage.setItem('sortField', field);
      localStorage.setItem('sortDirection', 'asc');
    }
  }, [sortField, sortDirection]);
  
  // 금일주문상태 컨테이너 정렬 핸들러
  const handleTodayOrdersSort = useCallback((field: string) => {
    if (field === todayOrdersSortField) {
      // 같은 필드를 다시 클릭한 경우, 정렬 상태 순환
      let newDirection: 'asc' | 'desc' | 'createdAt';
      
      if (todayOrdersSortDirection === 'asc') {
        newDirection = 'desc';
      } else if (todayOrdersSortDirection === 'desc') {
        newDirection = 'createdAt';
      } else {
        newDirection = 'asc';
      }
      
      setTodayOrdersSortDirection(newDirection);
      // localStorage에 저장
      localStorage.setItem('todayOrdersSortDirection', newDirection);
    } else {
      // 다른 필드를 클릭한 경우, 해당 필드로 변경하고 기본 정렬 방향 설정
      setTodayOrdersSortField(field);
      setTodayOrdersSortDirection('asc');
      // localStorage에 저장
      localStorage.setItem('todayOrdersSortField', field);
      localStorage.setItem('todayOrdersSortDirection', 'asc');
    }
  }, [todayOrdersSortField, todayOrdersSortDirection]);

  // 초기 데이터 로드
  useEffect(() => {
    console.log('컴포넌트 마운트: 초기 데이터 로드');
    
    // 초기 데이터 로드 - localStorage의 showAllOrders 값을 사용
    fetchOrders(selectedMonth, showAllOrders);
    fetchTodayOrders(); // 오늘 이후 주문 데이터도 함께 로드
    
    // 60초마다 자동 새로고침
    const refreshInterval = setInterval(() => {
      console.log('자동 새로고침 실행');
      // localStorage에서 현재 필터 설정 가져오기
      const currentShowAllOrders = localStorage.getItem('showAllOrders') === 'true';
      const currentSelectedMonth = localStorage.getItem('selectedMonth') || selectedMonth;
      const currentStartDate = localStorage.getItem('startDate') || startDate;
      const currentEndDate = localStorage.getItem('endDate') || endDate;
      const currentSortField = localStorage.getItem('sortField') || sortField;
      const currentSortDirection = localStorage.getItem('sortDirection') as 'asc' | 'desc' | 'createdAt' || sortDirection;
      
      console.log(`새로고침 설정: 월=${currentSelectedMonth}, 전체보기=${currentShowAllOrders}`);
      
      // state 업데이트
      setSelectedMonth(currentSelectedMonth);
      setShowAllOrders(currentShowAllOrders);
      setStartDate(currentStartDate);
      setEndDate(currentEndDate);
      setSortField(currentSortField);
      setSortDirection(currentSortDirection === 'asc' || currentSortDirection === 'desc' || currentSortDirection === 'createdAt' ? currentSortDirection : 'desc');
      
      // 현재 localStorage에 저장된 설정으로 데이터 가져오기
      fetchOrders(currentSelectedMonth, currentShowAllOrders);
      fetchTodayOrders();
    }, 60000);
    
    return () => {
      clearInterval(refreshInterval);
      
      // 진행 중인 요청 취소
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      
      if (todayControllerRef.current) {
        todayControllerRef.current.abort();
      }
    };
  }, [fetchOrders, fetchTodayOrders, selectedMonth, showAllOrders]);

  // localStorage에 필터 설정 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedMonth', selectedMonth);
      localStorage.setItem('showAllOrders', showAllOrders.toString());
      localStorage.setItem('startDate', startDate);
      localStorage.setItem('endDate', endDate);
      localStorage.setItem('sortField', sortField);
      localStorage.setItem('sortDirection', sortDirection);
      localStorage.setItem('todayOrdersSortField', todayOrdersSortField);
      localStorage.setItem('todayOrdersSortDirection', todayOrdersSortDirection);
    }
  }, [selectedMonth, showAllOrders, startDate, endDate, sortField, sortDirection, todayOrdersSortField, todayOrdersSortDirection]);

  // 로딩 상태 표시 컴포넌트
  const LoadingIndicator = () => (
    <div className="py-4 text-center">
      <div className="inline-block animate-spin mr-2 h-4 w-4 border-t-2 border-blue-500 rounded-full"></div>
      주문 목록을 불러오는 중...
    </div>
  );

  // 주문 없음 표시 컴포넌트
  const EmptyOrdersMessage = ({ onRefresh }: { onRefresh: () => void }) => (
    <div className="py-4 text-center">
      <div className="text-gray-500">주문이 없습니다.</div>
      <button 
        onClick={onRefresh} 
        className="mt-2 text-sm text-blue-500 hover:underline"
      >
        다시 시도하기
      </button>
    </div>
  );

  // 로딩 상태 표시
  if (status === 'loading') {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 md:mb-0">주문 관리</h1>
      </div>

      {/* 오늘 이후 주문 목록 (항상 전체 주문에서 오늘 이후 필터링) */}
      <Card className="mb-4">
        <CardHeader className="py-2">
          <CardTitle className="text-base flex items-center">
            <Calendar className="mr-1.5 h-4 w-4" />
            금일 주문 상태
            <span className="ml-2 text-xs text-gray-500">
              (총 {currentAndFutureOrders.length}건)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isTodayLoading ? (
            <LoadingIndicator />
          ) : currentAndFutureOrders.length === 0 ? (
            <EmptyOrdersMessage onRefresh={fetchTodayOrders} />
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full border-collapse">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center py-0.5 px-0.5">번호</TableHead>
                    <TableHead 
                      className="w-24 text-center py-0.5 px-0.5 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleTodayOrdersSort('status')}
                    >
                      배차상태
                      <SortIcon field="status" currentField={todayOrdersSortField} direction={todayOrdersSortDirection} />
                    </TableHead>
                    <TableHead 
                      className="w-28 text-center py-0.5 px-0.5 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleTodayOrdersSort('deliveryDate')}
                    >
                      납품일자
                      <SortIcon field="deliveryDate" currentField={todayOrdersSortField} direction={todayOrdersSortDirection} />
                    </TableHead>
                    <TableHead className="w-28 text-center py-0.5 px-0.5">지점명</TableHead>
                    <TableHead className="w-28 text-center py-0.5 px-0.5">하차지</TableHead>
                    <TableHead className="w-32 text-center py-0.5 px-0.5">메모</TableHead>
                    <TableHead className="w-32 text-center py-0.5 px-0.5">품목</TableHead>
                    <TableHead className="w-20 text-center py-0.5 px-0.5">수량</TableHead>
                    <TableHead className="w-20 text-center py-0.5 px-0.5">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCurrentAndFutureOrders.map((order, index) => (
                    <TableRow key={order.id} className="h-10">
                      <TableCell className="font-medium text-center py-0.5 px-0.5">{sortedCurrentAndFutureOrders.length - index}</TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">
                        <OrderStatusBadge 
                          status={order.status} 
                          isAdmin={session?.user?.role === 'ADMIN'} 
                          orderId={order.id}
                          onStatusChange={handleChangeStatus}
                        />
                      </TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">{new Date(order.deliveryDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">{order.user?.branchName || order.user?.name || '정보 없음'}</TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">{order.destination}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-center py-0.5 px-0.5">{order.memo}</TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">
                        {order.items && Array.isArray(order.items) ? (
                          <OrderItemsList items={order.items} />
                        ) : (
                          <span className="text-red-500">항목 없음</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">
                        {order.items && Array.isArray(order.items) 
                          ? order.items.map((item: any, idx: number) => (
                              <div key={idx} className="mb-0.5">
                                {item.quantity || 0}
                              </div>
                            ))
                          : 0}
                      </TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">
                        <div className="flex justify-center">
                          <OrderDetailsDialog 
                            order={order} 
                            onDelete={handleDeleteOrder} 
                            isObserver={session?.user?.role === 'OBSERVER'}
                            session={session}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관리자만 볼 수 있는 분석 테이블 */}
      {session?.user?.role === 'ADMIN' && (
        <OrderAnalyticsTable orders={orders} />
      )}

      {/* 필터링된 주문 목록 (월별 또는 전체) */}
      <Card className="mb-4">
        <CardHeader className="py-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base flex items-center">
              <ListIcon className="mr-1.5 h-4 w-4" />
              {showAllOrders 
                ? `${selectedMonth.slice(0, 4)}년 ${selectedMonth.slice(5, 7)}월 이후 주문 목록` 
                : `${selectedMonth.slice(0, 4)}년 ${selectedMonth.slice(5, 7)}월 주문 목록`}
              <span className="ml-2 text-xs text-gray-500">
                (총 {orders.length}건)
              </span>
            </CardTitle>
            
            {/* 헤더 오른쪽에 월 선택 UI와 버튼 배치 */}
            {session?.user?.role !== 'OBSERVER' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative w-8 h-8 rounded-full"
                    onClick={() => {
                      const monthInput = document.getElementById('month-selector') as HTMLInputElement;
                      if (monthInput) monthInput.showPicker();
                    }}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span className="sr-only">월 선택</span>
                  </Button>
                  <Input
                    id="month-selector"
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
                    className="opacity-0 absolute w-0 h-0 pointer-events-none"
                    aria-label="월 선택"
          />
                  <span className="hidden md:inline-block ml-2 text-sm text-gray-500">
                    {selectedMonth.slice(0, 4)}년 {selectedMonth.slice(5, 7)}월
                  </span>
        </div>
        
                <Button
                  variant="ghost"
                  size="icon"
            onClick={handleToggleAllOrders}
                  className={`relative w-8 h-8 rounded-full ${showAllOrders ? 'bg-gray-200' : ''}`}
                  title={showAllOrders ? '월별 주문 보기' : '선택 월 이후 모든 주문 보기'}
                >
                  <FilterIcon className="h-4 w-4" />
                  <span className="sr-only">{showAllOrders ? '월별 주문 보기' : '선택 월 이후 모든 주문 보기'}</span>
                </Button>
                <span className="hidden md:inline-block text-sm text-gray-500">
                  {showAllOrders ? '월별 주문 보기' : '선택 월 이후 모든 주문 보기'}
                </span>
                
                {/* 엑셀 다운로드 버튼 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExportToExcel}
                  className="relative w-8 h-8 rounded-full"
                  title="엑셀로 저장"
                >
                  <DownloadIcon className="h-4 w-4" />
                  <span className="sr-only">엑셀로 저장</span>
                </Button>
                <span className="hidden md:inline-block text-sm text-gray-500">
                  엑셀 저장
                </span>
        </div>
            )}
      </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingIndicator />
          ) : orders.length === 0 ? (
            <EmptyOrdersMessage onRefresh={() => fetchOrders(selectedMonth, showAllOrders)} />
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full border-collapse">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center py-0.5 px-0.5">번호</TableHead>
                    <TableHead 
                      className="w-24 text-center py-0.5 px-0.5 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      배차상태
                      <SortIcon field="status" currentField={sortField} direction={sortDirection} />
                    </TableHead>
                    <TableHead 
                      className="w-28 text-center py-0.5 px-0.5 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('deliveryDate')}
                    >
                      납품일자
                      <SortIcon field="deliveryDate" currentField={sortField} direction={sortDirection} />
                    </TableHead>
                    <TableHead 
                      className="w-28 text-center py-0.5 px-0.5 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('branchName')}
                    >
                      지점명
                      <SortIcon field="branchName" currentField={sortField} direction={sortDirection} />
                    </TableHead>
                    <TableHead className="w-28 text-center py-0.5 px-0.5">하차지</TableHead>
                    <TableHead className="w-32 text-center py-0.5 px-0.5">메모</TableHead>
                    <TableHead className="w-32 text-center py-0.5 px-0.5">품목</TableHead>
                    <TableHead className="w-20 text-center py-0.5 px-0.5">수량</TableHead>
                    <TableHead className="w-20 text-center py-0.5 px-0.5">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order, index) => (
                    <TableRow key={order.id} className="h-10">
                      <TableCell className="font-medium text-center py-0.5 px-0.5">{sortedOrders.length - index}</TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">
                            <OrderStatusBadge 
                              status={order.status} 
                              isAdmin={session?.user?.role === 'ADMIN'} 
                              orderId={order.id}
                              onStatusChange={handleChangeStatus}
                            />
                          </TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">{new Date(order.deliveryDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">{order.user?.branchName || order.user?.name || '정보 없음'}</TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">{order.destination}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-center py-0.5 px-0.5">{order.memo}</TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">
                        {order.items && Array.isArray(order.items) ? (
                          <OrderItemsList items={order.items} />
                            ) : (
                              <span className="text-red-500">항목 없음</span>
                            )}
                          </TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">
                        {order.items && Array.isArray(order.items) 
                          ? order.items.map((item: any, idx: number) => (
                              <div key={idx} className="mb-0.5">
                                    {item.quantity || 0}
                                  </div>
                                ))
                              : 0}
                          </TableCell>
                      <TableCell className="text-center py-0.5 px-0.5">
                        <div className="flex justify-center">
                          <OrderDetailsDialog 
                            order={order} 
                            onDelete={handleDeleteOrder} 
                            isObserver={session?.user?.role === 'OBSERVER'}
                            session={session}
                          />
                            </div>
                          </TableCell>
                        </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 새 주문 버튼 */}
      {session?.user?.role !== 'OBSERVER' && (
        <div className="fixed bottom-6 right-6 z-10">
          <Link 
            href="/orders/new" 
            className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16 shadow-lg transition-colors duration-200"
          >
            <PlusIcon className="h-8 w-8" />
          </Link>
        </div>
      )}
    </div>
  );
} 

