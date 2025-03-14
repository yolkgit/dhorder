'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

// 카카오 주소 검색 API 타입 정의
declare global {
  interface Window {
    daum: any;
  }
}

export default function EditOrderPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [items, setItems] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(true);
  
  // 카카오 주소 검색 API 스크립트 로드 상태
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);
  
  // URL에서 ID 추출
  const [orderId, setOrderId] = useState<string>('');
  
  // 컴포넌트 마운트 시 URL에서 ID 추출
  useEffect(() => {
    // URL에서 ID 추출
    const pathSegments = window.location.pathname.split('/');
    const idFromUrl = pathSegments[pathSegments.length - 2]; // URL 형식이 /orders/[id]/edit 이므로 뒤에서 두 번째 세그먼트가 ID
    
    if (idFromUrl) {
      setOrderId(idFromUrl);
    } else {
      toast.error('주문 ID를 찾을 수 없습니다.');
      router.push('/orders');
    }
  }, [router]);
  
  // 주문 정보 상태
  const [orderData, setOrderData] = useState({
    deliveryDate: '',
    arrivalTime: '',
    destination: '',
    address: '',
    detailAddress: '',
    phoneNumber: '',
    memo: '',
    status: 'RECEIVED',
  });

  // 주문 항목 상태
  const [orderItems, setOrderItems] = useState<Array<{ itemName: string; quantity: number }>>([]);

  // 데이터 로드
  useEffect(() => {
    if (status === 'authenticated' && session && orderId) {
      // 세션 정보 확인
      if (!session.user?.id) {
        toast.error('세션 정보가 올바르지 않습니다. 다시 로그인해주세요.');
        // 로그인 페이지로 강제 이동
        window.location.href = '/login';
        return;
      }

      // 품목 목록 불러오기
      fetchItems();
      
      // 주문 정보 불러오기
      fetchOrder();
    } else if (status === 'unauthenticated') {
      // 인증되지 않은 경우 로그인 페이지로 강제 이동
      window.location.href = '/login';
    }
  }, [session, status, orderId]);

  // 카카오 주소 검색 API 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => setIsKakaoMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 품목 목록 불러오기
  const fetchItems = async () => {
    try {
      setIsItemsLoading(true);
      const response = await fetch('/api/items');

      if (!response.ok) {
        throw new Error('품목 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setItems(data.items || []);
      console.log('품목 목록 로드 완료:', data.items);
    } catch (error) {
      console.error('품목 목록 조회 오류:', error);
      toast.error('품목 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsItemsLoading(false);
    }
  };

  // 주문 정보 불러오기
  const fetchOrder = async () => {
    try {
      // 세션 확인
      if (!session) {
        toast.error('로그인이 필요합니다.');
        router.push('/login');
        return false;
      }

      // orderId 확인
      if (!orderId) {
        toast.error('주문 ID가 유효하지 않습니다.');
        return false;
      }

      setIsLoading(true);

      // API 호출
      const response = await fetch(`/api/orders/${orderId}`);
      
      // 응답 처리
      if (!response.ok) {
        const errorData = await response.json();
        
        // 인증 오류 처리
        if (response.status === 401) {
          setSessionError(true);
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          return false;
        }
        
        // 기타 오류 처리
        setError(errorData.error || '주문 정보를 불러오는데 실패했습니다.');
        toast.error(errorData.error || '주문 정보를 불러오는데 실패했습니다.');
        return false;
      }
      
      // 주문 데이터 파싱
      const responseData = await response.json();
      
      // API 응답 구조 확인 및 주문 데이터 추출
      if (!responseData.success && !responseData.order) {
        toast.error('주문 데이터 형식이 올바르지 않습니다.');
        return false;
      }
      
      // 주문 데이터 추출 (API 응답 구조에 맞게 처리)
      const orderData = responseData.order || responseData;
      
      // 주소 분리 처리
      let baseAddress = orderData.address || '';
      let detailAddr = '';
      
      // 주소에 쉼표가 있으면 분리
      if (baseAddress.includes(',')) {
        const addressParts = baseAddress.split(',');
        baseAddress = addressParts[0].trim();
        detailAddr = addressParts.slice(1).join(',').trim();
      }
      
      // 주문 데이터 설정
      setOrderData({
        deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate).toISOString().split('T')[0] : '',
        arrivalTime: orderData.arrivalTime || '',
        destination: orderData.destination || '',
        address: baseAddress,
        detailAddress: detailAddr,
        phoneNumber: orderData.phoneNumber || '',
        memo: orderData.memo || '',
        status: orderData.status || 'RECEIVED',
      });
      
      // 주문 항목 설정
      if (orderData.orderItems && Array.isArray(orderData.orderItems) && orderData.orderItems.length > 0) {
        setOrderItems(orderData.orderItems.map((item: any) => ({
          itemName: item.itemName,
          quantity: item.quantity
        })));
      } else {
        // 주문 항목이 없는 경우 기본 빈 항목 추가
        setOrderItems([{ itemName: '', quantity: 0 }]);
        console.log('주문 항목이 없어 기본 항목을 추가했습니다.');
      }
      
      return true;
    } catch (error) {
      console.error('주문 정보 조회 오류:', error);
      setError('주문 정보를 불러오는데 실패했습니다.');
      toast.error('주문 정보를 불러오는데 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 확인
  if (status === 'loading') {
    return <div>로딩 중...</div>;
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 빈 문자열이면 그대로 반환
    if (!numbers) return '';
    
    // 전화번호 형식에 따라 포맷팅
    if (numbers.length <= 3) {
      // 3자리 이하: 그대로 반환
      return numbers;
    } else if (numbers.length <= 7) {
      // 4-7자리: 지역번호 또는 휴대폰 앞자리 분리
      // 예: 02-1234 또는 010-1234
      const part1 = numbers.substring(0, 3);
      const part2 = numbers.substring(3);
      return `${part1}-${part2}`;
    } else if (numbers.length <= 11) {
      // 8-11자리: 일반적인 전화번호 형식
      // 지역번호가 2자리인 경우 (02로 시작하는 서울 지역번호)
      if (numbers.startsWith('02') && numbers.length <= 10) {
        const part1 = numbers.substring(0, 2);
        const part2 = numbers.substring(2, 6);
        const part3 = numbers.substring(6);
        return `${part1}-${part2}-${part3}`;
      }
      // 지역번호가 3자리인 경우 (031, 032 등) 또는 휴대폰 번호 (010, 011 등)
      else {
        const part1 = numbers.substring(0, 3);
        const part2 = numbers.substring(3, 7);
        const part3 = numbers.substring(7);
        return `${part1}-${part2}-${part3}`;
      }
    } else {
      // 11자리 초과: 앞에서부터 11자리만 사용하고 포맷팅
      const truncated = numbers.substring(0, 11);
      const part1 = truncated.substring(0, 3);
      const part2 = truncated.substring(3, 7);
      const part3 = truncated.substring(7);
      return `${part1}-${part2}-${part3}`;
    }
  };

  // 입력 필드 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // 전화번호 필드인 경우 포맷팅 적용
    if (name === 'phoneNumber') {
      setOrderData((prev) => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
      setOrderData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 주소 검색 핸들러
  const handleAddressSearch = () => {
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
  };

  // 주문 항목 변경 핸들러
  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...orderItems];
    (updatedItems[index] as any)[field] = value;
    setOrderItems(updatedItems);
    
    // 품목 선택 시 자동으로 포커스를 수량 필드로 이동
    if (field === 'itemName' && value) {
      setTimeout(() => {
        const quantityInput = document.getElementById(`quantity-${index}`);
        if (quantityInput) {
          quantityInput.focus();
        }
      }, 100);
    }
  };

  // 주문 항목 추가 핸들러
  const handleAddItem = () => {
    setOrderItems([...orderItems, { itemName: '', quantity: 0 }]);
    
    // 새 항목 추가 후 자동으로 포커스 이동
    setTimeout(() => {
      const newItemIndex = orderItems.length;
      const newItemSelect = document.getElementById(`itemName-${newItemIndex}`);
      if (newItemSelect) {
        newItemSelect.focus();
      }
    }, 100);
  };

  // 주문 항목 삭제 핸들러
  const handleRemoveItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    } else {
      toast.error('최소 하나의 품목이 필요합니다.');
    }
  };

  // 주문 수정 함수
  const updateOrder = async (orderData: any) => {
    try {
      // orderId 확인
      if (!orderId) {
        toast.error('주문 ID가 유효하지 않습니다.');
        return false;
      }

      // 주소와 상세 주소 합치기
      const fullAddress = orderData.detailAddress 
        ? `${orderData.address}, ${orderData.detailAddress}`
        : orderData.address;
      
      // 전송할 데이터 구성
      const dataToSend = {
        ...orderData,
        address: fullAddress,
        items: orderData.orderItems // orderItems를 items로 변경
      };
      
      // 불필요한 필드 제거
      delete dataToSend.detailAddress;
      delete dataToSend.orderItems; // API는 items 필드를 사용함
      
      console.log('전송할 데이터:', JSON.stringify(dataToSend, null, 2));
      
      // API 호출
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.action === 'relogin') {
          setSessionError(true);
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
          // 약간의 지연 후 로그인 페이지로 강제 이동
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          return false;
        }
        
        toast.error(data.error || '주문 수정 중 오류가 발생했습니다.');
        return false;
      }
      
      return true;
    } catch (error) {
      toast.error('주문 수정 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 주문 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 필수 필드 검증
      if (!orderData.deliveryDate || !orderData.destination) {
        toast.error('배송일과 하차지는 필수 입력 항목입니다.');
        setIsLoading(false);
        return;
      }
      
      // 주문 항목 검증
      const validItems = orderItems.filter(item => item.itemName && item.itemName.trim() !== '' && item.quantity > 0);
      
      if (validItems.length === 0) {
        toast.error('최소 하나 이상의 유효한 주문 항목이 필요합니다.');
        
        // 주문 항목이 비어있는 경우 첫 번째 항목에 포커스
        setTimeout(() => {
          const firstItemSelect = document.getElementById('itemName-0');
          if (firstItemSelect) {
            firstItemSelect.focus();
          }
        }, 100);
        
        setIsLoading(false);
        return;
      }
      
      // 주문 데이터 준비
      const orderDataToSend = {
        ...orderData,
        orderItems: validItems.map(item => ({
          itemName: item.itemName.trim(),
          quantity: Number(item.quantity)
        }))
      };
      
      // 주문 수정 API 호출
      const success = await updateOrder(orderDataToSend);
      
      if (success) {
        toast.success('주문이 성공적으로 수정되었습니다.');
        
        // 성공 시 약간의 지연 후 주문 목록 페이지로 강제 이동
        setTimeout(() => {
          // router.push 대신 window.location.href 사용
          window.location.href = '/orders';
        }, 1000);
      }
    } catch (error) {
      toast.error('주문 수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !orderData.deliveryDate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">주문 정보를 불러오는 중...</h2>
          <p className="text-gray-500">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">주문 수정</h1>
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
                    배송일 *
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
                    도착 시간
                  </label>
                  <Input
                    id="arrivalTime"
                    name="arrivalTime"
                    type="time"
                    value={orderData.arrivalTime}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="destination" className="text-sm font-medium">
                    하차지 *
                  </label>
                  <Input
                    id="destination"
                    name="destination"
                    type="text"
                    placeholder="하차지 입력"
                    value={orderData.destination}
                    onChange={handleChange}
                    required
                  />
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
                {orderItems.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-gray-300 rounded-md">
                    <p className="text-gray-500 mb-2">주문 항목이 없습니다.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      className="flex items-center gap-1 mx-auto"
                    >
                      <PlusCircle className="h-4 w-4" />
                      항목 추가
                    </Button>
                  </div>
                ) : (
                  orderItems.map((item, index) => (
                    <div 
                      key={index} 
                      className={`flex items-end gap-2 p-3 border rounded-md ${
                        !item.itemName ? 'border-orange-200 bg-orange-50' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 space-y-2">
                        <label htmlFor={`itemName-${index}`} className="text-sm font-medium">
                          품목 * {!item.itemName && <span className="text-red-500 text-xs">(필수 선택)</span>}
                        </label>
                        {isItemsLoading ? (
                          <div className="h-10 bg-gray-100 animate-pulse rounded"></div>
                        ) : items.length > 0 ? (
                          <select
                            id={`itemName-${index}`}
                            className={`w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              !item.itemName ? 'border-orange-300' : 'border-gray-300'
                            }`}
                            value={item.itemName}
                            onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                            required
                          >
                            <option value="">품목을 선택해주세요</option>
                            {items.map((itemOption) => (
                              <option key={itemOption.id} value={itemOption.name}>
                                {itemOption.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={`itemName-${index}`}
                            placeholder="품목명 입력"
                            value={item.itemName}
                            onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                            required
                            className={!item.itemName ? 'border-orange-300' : ''}
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
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="항목 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
          
              </CardContent>
            </Card>
          </div>

          {/* 폼 제출 버튼 */}
          <div className="mt-6 flex justify-end gap-3">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => router.push('/orders')}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? '저장 중...' : '주문 저장'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 




