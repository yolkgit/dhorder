'use client';

import { Truck } from 'lucide-react';

interface OrderStatusBadgeProps {
  status: string;
  isAdmin: boolean;
  orderId: string;
  onStatusChange?: (id: string, status: string) => void;
}

// 주문 상태 표시 컴포넌트
const OrderStatusBadge = ({ status, isAdmin, orderId, onStatusChange }: OrderStatusBadgeProps) => {
  // 상태별 색상 및 스타일 설정
  let iconColor = 'text-gray-500';
  let bgColor = 'bg-gray-100';
  let hoverClass = '';
  
  if (status === 'RECEIVED') {
    iconColor = 'text-gray-500';
    bgColor = 'bg-gray-100';
  } else if (status === 'DISPATCHED') {
    iconColor = 'text-blue-500';
    bgColor = 'bg-blue-100';
  } else if (status === 'DELIVERED') {
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
      }[status] || 'RECEIVED';
      
      onStatusChange(orderId, nextStatus);
    }
  };

  // 상태 텍스트 (툴팁용)
  const statusText = {
    RECEIVED: '주문접수',
    DISPATCHED: '차량배차',
    DELIVERED: '배송완료',
  }[status] || status;

  return (
    <div 
      className={`flex justify-center items-center p-2 rounded-full ${bgColor} ${hoverClass}`} 
      title={statusText} 
      onClick={handleClick}
    >
      <Truck className={`h-5 w-5 ${iconColor}`} />
    </div>
  );
};

export default OrderStatusBadge; 