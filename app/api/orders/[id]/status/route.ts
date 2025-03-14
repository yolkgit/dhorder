import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { sendOrderUpdateNotification } from '@/lib/telegram';

// 주문 상태 변경 API
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "인증되지 않은 요청입니다" },
        { status: 401 }
      );
    }

    // Next.js 13.4 이상에서는 params가 Promise일 수 있으므로 await를 사용합니다
    const orderId = await params.id;

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN') {
      console.log('권한 부족: 관리자만 상태 변경 가능');
      return NextResponse.json(
        { error: '관리자만 주문 상태를 변경할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { status } = await req.json();

    // 상태 값 검증
    const validStatuses = ['RECEIVED', 'DISPATCHED', 'DELIVERED'];
    if (!validStatuses.includes(status)) {
      console.log(`유효하지 않은 상태 값: ${status}`);
      return NextResponse.json(
        { error: '유효하지 않은 주문 상태입니다.' },
        { status: 400 }
      );
    }

    // 주문 존재 여부 확인
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      console.log(`주문을 찾을 수 없음: ${orderId}`);
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이전 상태 저장
    const oldStatus = existingOrder.status;

    // 주문 상태 업데이트
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        orderItems: true,
        user: {
          select: {
            name: true,
            branchName: true,
          },
        },
      },
    });

    console.log(`주문 상태 변경 성공: ${orderId}, 새 상태: ${status}`);
    
    // 텔레그램 알림 전송 (배차 상태나 배송완료 상태로 변경 시에는 알림을 보내지 않음)
    if (status !== 'DISPATCHED' && status !== 'DELIVERED') {
      // 배차 상태나 배송완료 상태가 아닌 경우에만 알림 전송
      sendOrderUpdateNotification(updatedOrder, oldStatus).catch(error => {
        console.error('텔레그램 알림 전송 실패:', error);
      });
    } else {
      console.log(`${status === 'DISPATCHED' ? '배차' : '배송완료'} 상태 변경은 텔레그램 알림을 전송하지 않습니다.`);
    }
    
    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('주문 상태 변경 오류:', error);
    return NextResponse.json(
      { error: '주문 상태 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 
