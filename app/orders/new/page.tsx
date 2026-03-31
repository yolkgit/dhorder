'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Search } from 'lucide-react';
import Link from 'next/link';

// 카카오 주소 검색 API 타입 정의
declare global {
  interface Window {
    daum: any;
  }
}

// 주문 항목 타입 정의
interface OrderItem {
  itemName: string;
  quantity: number;
}

// 하차지 옵션 타입 정의
interface DestinationOption {
  destination: string;
  address: string;
  phoneNumber: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(true);

  // 하차지 자동완성을 위한 상태
  const [destinationOptions, setDestinationOptions] = useState<DestinationOption[]>([]);
  const [showDestinationOptions, setShowDestinationOptions] = useState(false);
  const [isDestinationLoading, setIsDestinationLoading] = useState(false);

  // 카카오 주소 검색 API 스크립트 로드 상태
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);

  // 현재 날짜를 YYYY-MM-DD 형식으로 변환하는 함수
  const getCurrentDate = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // 세션 정보 확인 및 품목 목록 불러오기
  useEffect(() => {
    if (status === 'authenticated' && session) {
      // 세션 정보 확인
      if (!session.user?.id) {
        toast.error('세션 정보가 올바르지 않습니다. 다시 로그인해주세요.');
        // 로그인 페이지로 강제 이동
        window.location.href = '/login';
        return;
      }
      
      // 품목 목록 불러오기
      fetchItems();
    } else if (status === 'unauthenticated') {
      // 인증되지 않은 경우 로그인 페이지로 강제 이동
      window.location.href = '/login';
    }
  }, [session, status]);

  // 카카오 주소 검색 API 스크립트 로드
  useEffect(() => {
    // 이미 로드된 경우 스킵
    if (window.daum) {
      setIsKakaoMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => setIsKakaoMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      // 스크립트가 존재하는 경우에만 제거
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);
  
  // 품목 목록 불러오기
  const fetchItems = useCallback(async () => {
    try {
      setIsItemsLoading(true);
      const response = await fetch('/api/items');
      
      if (!response.ok) {
        throw new Error('품목 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setItems(data.items || []);
      
      // 품목 목록이 로드되면 첫 번째 주문 항목의 품목을 "RPM 25kg"으로 설정
      if (data.items && data.items.length > 0) {
        const rpmItem = data.items.find((item: any) => item.name === 'RPM 25kg');
        if (rpmItem) {
          setOrderItems(prevItems => {
            const updatedItems = [...prevItems];
            if (updatedItems[0].itemName === '') {
              updatedItems[0].itemName = 'RPM 25kg';
            }
            return updatedItems;
          });
        }
      }
    } catch (error) {
      console.error('품목 목록 조회 오류:', error);
      toast.error('품목 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsItemsLoading(false);
    }
  }, []);

  // 주문 정보 상태 - 기본값 설정
  const [orderData, setOrderData] = useState({
    deliveryDate: getCurrentDate(), // 현재 날짜를 기본값으로 설정
    arrivalTime: '09:00', // 9:00을 기본값으로 설정
    destination: '',
    address: '',
    detailAddress: '', // 상세 주소 필드 추가
    phoneNumber: '',
    memo: '',
    isWingCarRestricted: false,
  });

  // 주문 항목 상태
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { itemName: '', quantity: 0 },
  ]);

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = useCallback((value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 빈 문자열이면 그대로 반환
    if (!numbers) return '';
    
    // 전화번호 길이가 11자리를 초과하면 11자리로 제한
    const limitedNumbers = numbers.length > 11 ? numbers.substring(0, 11) : numbers;
    
    // 3자리 이하는 그대로 반환
    if (limitedNumbers.length <= 3) {
      return limitedNumbers;
    }
    
    // 02로 시작하는 서울 지역번호
    if (limitedNumbers.startsWith('02')) {
      // 02-123-1234 형식 (7자리 번호)
      if (limitedNumbers.length <= 7) {
        const part1 = limitedNumbers.substring(0, 2);
        const part2 = limitedNumbers.substring(2, 5);
        const part3 = limitedNumbers.substring(5);
        return part3 ? `${part1}-${part2}-${part3}` : `${part1}-${part2}`;
      }
      // 02-1234-1234 형식 (8자리 번호)
      else {
        const part1 = limitedNumbers.substring(0, 2);
        const part2 = limitedNumbers.substring(2, 6);
        const part3 = limitedNumbers.substring(6);
        return part3 ? `${part1}-${part2}-${part3}` : `${part1}-${part2}`;
      }
    }
    
    // 3자리 지역번호 (010, 031, 041, 043 등)
    else {
      // 입력 중일 때 (xxx-xxxx 형식)
      if (limitedNumbers.length > 3 && limitedNumbers.length <= 7) {
        const part1 = limitedNumbers.substring(0, 3);
        const part2 = limitedNumbers.substring(3);
        return `${part1}-${part2}`;
      }
      // 완성된 번호 (xxx-xxxx-xxxx 형식)
      else if (limitedNumbers.length > 7) {
        const part1 = limitedNumbers.substring(0, 3);
        const part2 = limitedNumbers.substring(3, 7);
        const part3 = limitedNumbers.substring(7);
        return part3 ? `${part1}-${part2}-${part3}` : `${part1}-${part2}`;
      }
      // 기타 경우
      else {
        return limitedNumbers;
      }
    }
  }, []);

  // 인증 확인
  if (status === 'loading') {
    return <div>로딩 중...</div>;
  }

  if (!session) {
    // 로그인 페이지로 강제 이동
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  // 입력 필드 변경 핸들러
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // 전화번호 필드인 경우 포맷팅 적용
    if (name === 'phoneNumber') {
      setOrderData((prev) => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
    setOrderData((prev) => ({ ...prev, [name]: value }));
    }
    
    // 하차지 입력 시 자동완성 데이터 검색
    if (name === 'destination' && value.trim().length > 0) {
      // 디바운스 처리를 위한 타이머 설정
      const timer = setTimeout(() => {
        searchDestinations(value);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (name === 'destination' && value.trim().length === 0) {
      setShowDestinationOptions(false);
    }
  }, [formatPhoneNumber]);
  
  // 하차지 검색 함수
  const searchDestinations = useCallback(async (query: string) => {
    if (query.trim().length < 1) {
      setDestinationOptions([]);
      setShowDestinationOptions(false);
      return;
    }
    
    setIsDestinationLoading(true);
    try {
      // 기존 주문에서 하차지 정보 검색
      const response = await fetch(`/api/orders?search=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('하차지 정보를 검색하는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 중복 제거 및 정렬
      const uniqueDestinations = Array.from(
        new Map(
          data.orders
            .filter((order: any) => order.destination && order.destination.includes(query))
            .map((order: any) => [
              order.destination,
              {
                destination: order.destination,
                address: order.address || '',
                phoneNumber: order.phoneNumber || ''
              }
            ])
        ).values()
      ) as DestinationOption[];
      
      setDestinationOptions(uniqueDestinations);
      setShowDestinationOptions(uniqueDestinations.length > 0);
    } catch (error) {
      console.error('하차지 검색 오류:', error);
    } finally {
      setIsDestinationLoading(false);
    }
  }, []);
  
  // 하차지 선택 핸들러
  const handleSelectDestination = useCallback((option: DestinationOption) => {
    setOrderData(prev => ({
      ...prev,
      destination: option.destination,
      address: option.address,
      phoneNumber: option.phoneNumber
    }));
    setShowDestinationOptions(false);
  }, []);

  // 주소 검색 핸들러
  const handleAddressSearch = useCallback(() => {
    if (!isKakaoMapLoaded) {
      toast.error('주소 검색 서비스를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: function(data: any) {
        // 도로명 주소 선택
        let fullAddress = data.roadAddress || data.jibunAddress;
        
        // 건물명이 있으면 추가
        if (data.buildingName) {
          fullAddress += ` (${data.buildingName})`;
        }
        
        // 주소 정보 업데이트
        setOrderData(prev => ({
          ...prev,
          address: fullAddress,
          detailAddress: '' // 상세 주소 초기화
        }));
        
        toast.success('주소가 입력되었습니다. 상세 주소를 입력해주세요.');
      }
    }).open();
  }, [isKakaoMapLoaded]);

  // 주문 항목 변경 핸들러
  const handleItemChange = useCallback((index: number, field: string, value: any) => {
    setOrderItems(prevItems => {
      const updatedItems = [...prevItems];
    (updatedItems[index] as any)[field] = value;
      return updatedItems;
    });
  }, []);

  // 주문 항목 추가 핸들러
  const handleAddItem = useCallback(() => {
    // 품목 목록에서 "RPM 25kg" 찾기
    const rpmItem = items.find(item => item.name === 'RPM 25kg');
    // 기본 품목을 "RPM 25kg"으로 설정하거나, 없으면 빈 문자열로 설정
    const defaultItemName = rpmItem ? 'RPM 25kg' : '';
    
    setOrderItems(prevItems => [...prevItems, { itemName: defaultItemName, quantity: 0 }]);
  }, [items]);

  // 주문 항목 삭제 핸들러
  const handleRemoveItem = useCallback((index: number) => {
    setOrderItems(prevItems => {
      if (prevItems.length > 1) {
        return prevItems.filter((_, i) => i !== index);
    } else {
      toast.error('최소 하나의 품목이 필요합니다.');
        return prevItems;
      }
    });
  }, []);

  // 품목 선택 옵션 메모이제이션
  const itemOptions = useMemo(() => {
    return items.map((itemOption) => (
      <option key={itemOption.id} value={itemOption.name}>
        {itemOption.name}
      </option>
    ));
  }, [items]);

  // 하차지 옵션 목록 메모이제이션
  const destinationOptionsList = useMemo(() => {
    return destinationOptions.map((option, index) => (
      <div
        key={index}
        className="p-2 hover:bg-gray-100 cursor-pointer"
        onClick={() => handleSelectDestination(option)}
      >
        <div className="font-medium">{option.destination}</div>
        {option.address && <div className="text-sm text-gray-500">{option.address}</div>}
      </div>
    ));
  }, [destinationOptions, handleSelectDestination]);

  // 주문 항목 렌더링 최적화
  const renderOrderItems = useMemo(() => {
    return orderItems.map((item, index) => (
      <div key={index} className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <label htmlFor={`itemName-${index}`} className="text-sm font-medium">
            품목 *
          </label>
          {isItemsLoading ? (
            <div className="h-10 bg-gray-100 animate-pulse rounded"></div>
          ) : items.length > 0 ? (
            <select
              id={`itemName-${index}`}
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={item.itemName}
              onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
              required
            >
              <option value="">품목 선택</option>
              {itemOptions}
            </select>
          ) : (
            <Input
              id={`itemName-${index}`}
              placeholder="품목명 입력"
              value={item.itemName}
              onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
              required
            />
          )}
        </div>
        <div className="w-24 space-y-2">
          <label htmlFor={`quantity-${index}`} className="text-sm font-medium">
            수량 *
          </label>
          <Input
            id={`quantity-${index}`}
            type="number"
            min="0"
            value={item.quantity}
            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            required
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleRemoveItem(index)}
          disabled={orderItems.length === 1}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ));
  }, [orderItems, isItemsLoading, items.length, itemOptions, handleItemChange, handleRemoveItem]);

  // 주문 생성 함수
  const createOrder = useCallback(async (orderData: any) => {
    try {
      // 주소와 상세 주소 합치기
      const fullAddress = orderData.detailAddress 
        ? `${orderData.address}, ${orderData.detailAddress}`
        : orderData.address;
      
      // 전송할 데이터 구성
      const dataToSend = {
        ...orderData,
        address: fullAddress,
      };
      
      // detailAddress 필드 제거 (API에서 사용하지 않음)
      delete dataToSend.detailAddress;
      
      console.log('주문 데이터 전송:', JSON.stringify(dataToSend, null, 2));
      
      // 기본 fetch API를 사용하여 요청
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(dataToSend)
      });
      
      // 응답 텍스트 가져오기
      const responseText = await response.text();
      
      // 빈 응답 처리
      if (!responseText || responseText.trim() === '') {
        console.error('서버에서 빈 응답을 반환했습니다.');
        throw new Error('서버에서 빈 응답을 반환했습니다.');
      }
      
      // JSON 파싱
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('서버 응답 파싱 오류:', parseError, '원본 응답:', responseText);
        throw new Error('서버 응답을 처리하는데 실패했습니다.');
      }
      
      // 응답 상태 확인
      if (!response.ok) {
        const errorMessage = data?.error || '주문 생성 중 오류가 발생했습니다.';
        console.error('주문 생성 API 오류:', errorMessage, '상태 코드:', response.status);
        throw new Error(errorMessage);
      }
      
      // 성공 응답 처리
      if (data.success) {
        toast.success(data.message || '주문이 성공적으로 생성되었습니다.');
        
        // 성공 시 주문 목록 페이지로 강제 이동
        setTimeout(() => {
          // router.push 대신 window.location.href 사용
          window.location.href = '/orders';
        }, 1500);
        
        return data;
      } else {
        console.error('주문 생성 실패:', data);
        throw new Error(data.error || '주문 생성 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      // 재로그인 필요 여부 확인
      if (error.message?.includes('인증') || error.message?.includes('세션')) {
        toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
        setTimeout(() => {
          // 로그인 페이지로도 강제 이동
          window.location.href = '/login';
        }, 1500);
      } else {
        toast.error(error.message || '주문 생성 중 오류가 발생했습니다.');
      }
      
      throw error;
    }
  }, []);

  // 주문 제출 핸들러
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 먼저 로딩 상태를 true로 설정
    setIsLoading(true);
    
    try {
      // 필수 필드 검증
      if (!orderData.deliveryDate) {
        toast.error('납품일자를 선택해주세요.');
        setIsLoading(false);
        return;
      }
      
      if (!orderData.arrivalTime) {
        toast.error('도착시간을 입력해주세요.');
        setIsLoading(false);
        return;
      }
      
      if (!orderData.destination) {
        toast.error('하차지를 입력해주세요.');
        setIsLoading(false);
        return;
      }
      
      if (!orderData.address) {
        toast.error('주소를 입력해주세요.');
        setIsLoading(false);
        return;
      }
      
      if (!orderData.phoneNumber) {
        toast.error('연락처를 입력해주세요.');
        setIsLoading(false);
        return;
      }
      
      // 품목 검증
      const validItems = orderItems.filter(item => item.itemName.trim() !== '' && item.quantity > 0);
      
      if (validItems.length === 0) {
        toast.error('최소 하나 이상의 품목을 추가해주세요.');
        setIsLoading(false);
        return;
      }
      
      // 주문 데이터 구성
      const orderDataToSend = {
        ...orderData,
        orderItems: validItems,
      };
      
      toast.info('주문을 처리 중입니다...', { duration: 2000 });
      
      try {
        await createOrder(orderDataToSend);
      } catch (error) {
        // 오류는 createOrder 내부에서 처리됨
        console.error('주문 생성 오류:', error);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('주문 처리 오류:', error);
      toast.error('주문 처리 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  }, [orderData, orderItems, createOrder]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">새 주문 작성</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/orders">주문 목록으로 돌아가기</Link>
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 주문 정보 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>주문 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="deliveryDate" className="text-sm font-medium">
                    납품일자 *
                  </label>
                  <Input
                    id="deliveryDate"
                    name="deliveryDate"
                    type="date"
                    value={orderData.deliveryDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="arrivalTime" className="text-sm font-medium">
                    도착시간 *
                  </label>
                  <Input
                    id="arrivalTime"
                    name="arrivalTime"
                    type="time"
                    value={orderData.arrivalTime}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="destination" className="text-sm font-medium">
                      하차지 *
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="isWingCarRestricted"
                        checked={orderData.isWingCarRestricted || false}
                        onChange={(e) => setOrderData(prev => ({ ...prev, isWingCarRestricted: e.target.checked }))}
                        className="w-4 h-4 accent-red-500 cursor-pointer"
                      />
                      <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-200">윙카X</span>
                    </label>
                  </div>
                  <Input
                    id="destination"
                    name="destination"
                    type="text"
                    placeholder="하차지 입력"
                    value={orderData.destination}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                  />
                  
                  {/* 하차지 자동완성 드롭다운 */}
                  {showDestinationOptions && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {isDestinationLoading ? (
                        <div className="p-2 text-center text-gray-500">검색 중...</div>
                      ) : destinationOptions.length > 0 ? (
                        <ul className="py-1">
                          {destinationOptionsList}
                        </ul>
                      ) : (
                        <div className="p-2 text-center text-gray-500">검색 결과가 없습니다</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium">
                    기본 주소 *
                  </label>
                  <div className="flex gap-2">
                  <Input
                    id="address"
                    name="address"
                    type="text"
                      placeholder="도로명 주소 검색"
                    value={orderData.address}
                    onChange={handleChange}
                    required
                      className="flex-1"
                      readOnly={true}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddressSearch}
                      className="whitespace-nowrap"
                    >
                      <Search className="h-4 w-4 mr-1" />
                      주소 검색
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="detailAddress" className="text-sm font-medium">
                    상세 주소
                  </label>
                  <Input
                    id="detailAddress"
                    name="detailAddress"
                    type="text"
                    placeholder="상세 주소 입력 (동, 호수 등)"
                    value={orderData.detailAddress}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className="text-sm font-medium">
                    전화번호 *
                  </label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder="전화번호 입력 (숫자만 입력하세요)"
                    value={orderData.phoneNumber}
                    onChange={handleChange}
                    required
                    maxLength={13} // 최대 길이 설정 (하이픈 포함)
                  />
                  <p className="text-xs text-gray-500">
                    예시: 02-1234-5678 또는 010-1234-5678
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="memo" className="text-sm font-medium">
                    메모
                  </label>
                  <Textarea
                    id="memo"
                    name="memo"
                    placeholder="추가 메모 입력"
                    value={orderData.memo}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 주문 항목 카드 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>주문 항목</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  항목 추가
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderOrderItems}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end">
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  처리 중...
                </span>
              ) : '주문하기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 