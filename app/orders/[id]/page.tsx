'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Edit, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import OrderStatusBadge from '@/components/OrderStatusBadge';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const orderId = params.id as string;

  useEffect(() => {
    if (status === 'authenticated' && orderId) {
      fetchOrderDetails();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, orderId, router]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`주문 정보를 가져오는데 실패했습니다: ${response.status}`);
      }
      
      const data = await response.json();
      setOrder(data.order);
    } catch (error) {
      toast.error('주문 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('상태 변경에 실패했습니다.');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      toast.success('주문 상태가 변경되었습니다.');
    } catch (error) {
      toast.error('주문 상태 변경에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">주문 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <h2 className="text-xl font-bold mb-2">주문을 찾을 수 없습니다</h2>
          <p className="mb-4">요청하신 주문 정보가 존재하지 않습니다.</p>
          <Button asChild>
            <Link href="/orders">주문 목록으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link href="/orders">
            <ArrowLeft className="h-4 w-4 mr-1" />
            주문 목록
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">주문 상세 정보</h1>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>주문 정보</CardTitle>
          <div className="flex items-center gap-2">
            <OrderStatusBadge 
              status={order.status} 
              isAdmin={session?.user?.role === 'ADMIN'} 
              orderId={order.id}
              onStatusChange={handleChangeStatus}
            />
            {order.status === 'RECEIVED' && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/orders/${order.id}/edit`}>
                  <Edit className="h-4 w-4 mr-1" />
                  수정
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">주문 번호</p>
              <p className="font-medium">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">주문 일시</p>
              <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">지점명</p>
              <p className="font-medium">{order.user?.branchName || order.user?.name || '정보 없음'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">납품 일자</p>
              <p className="font-medium">{new Date(order.deliveryDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">도착 시간</p>
              <p className="font-medium">{order.arrivalTime}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">연락처</p>
              <p className="font-medium">{order.phoneNumber || '정보 없음'}</p>
            </div>
          </div>

          <hr className="my-4" />

          <div>
            <p className="text-sm text-gray-500 mb-1">배송지 정보</p>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="font-medium mb-1">{order.destination}</p>
              <p className="text-sm text-gray-600">{order.address}</p>
            </div>
          </div>

          <hr className="my-4" />

          <div>
            <p className="text-sm text-gray-500 mb-1">메모</p>
            <div className="bg-gray-50 p-3 rounded-md min-h-[60px]">
              <p className="text-sm whitespace-pre-wrap">{order.memo || '메모 없음'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>주문 품목</CardTitle>
        </CardHeader>
        <CardContent>
          {order.orderItems && order.orderItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-4 py-2 text-left">품목명</th>
                    <th className="border px-4 py-2 text-center">수량</th>
                  </tr>
                </thead>
                <tbody>
                  {order.orderItems.map((item: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="border px-4 py-2">{item.item?.name || '품목 정보 없음'}</td>
                      <td className="border px-4 py-2 text-center">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">주문 품목이 없습니다.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 

