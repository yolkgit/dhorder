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
    // 요청 타임스탬프 확인 (URL에서 t 파라미터)
    const url = new URL(req.url);
    const timestamp = url.searchParams.get('t') || Date.now().toString();
    
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "인증되지 않은 요청입니다", timestamp },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    const orderId = params.id;

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자만 주문 상태를 변경할 수 있습니다.', timestamp },
        { 
          status: 403,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    const body = await req.json();
    const { status } = body;

    // 상태 값 검증
    const validStatuses = ['RECEIVED', 'DISPATCHED', 'DELIVERED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 주문 상태입니다.', timestamp },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // 주문 존재 여부 확인
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.', timestamp },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // 이전 상태 저장
    const oldStatus = existingOrder.status;

    // 주문 상태 업데이트
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status,
        updatedAt: new Date() // 명시적으로 updatedAt 갱신
      },
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
    
    // 🔥 텔레그램 알림 전송 (개선된 에러 처리)
    if (status !== 'DISPATCHED' && status !== 'DELIVERED') {
      try {
        console.log(`[상태변경] 텔레그램 알림 전송 시작 - 주문 ID: ${orderId}, 상태: ${oldStatus} → ${status}`);
        await sendOrderUpdateNotification(updatedOrder, oldStatus);
        console.log(`[상태변경] 텔레그램 알림 전송 처리 완료 - 주문 ID: ${orderId}`);
      } catch (telegramError) {
        // 텔레그램 알림 실패는 상태 변경 성공에 영향을 주지 않음
        console.error(`[상태변경] 텔레그램 알림 전송 실패 - 주문 ID: ${orderId}:`, {
          error: telegramError instanceof Error ? telegramError.message : String(telegramError),
          stack: telegramError instanceof Error ? telegramError.stack : undefined
        });
      }
    } else {
      console.log(`[상태변경] ${status === 'DISPATCHED' ? '배차' : '배송완료'} 상태로 변경되어 텔레그램 알림을 전송하지 않습니다. - 주문 ID: ${orderId}`);
    }
    
    // 주문 아이템 변환 및 응답 최적화
    const formattedOrder = {
      id: updatedOrder.id,
      status: updatedOrder.status,
      deliveryDate: updatedOrder.deliveryDate,
      destination: updatedOrder.destination,
      updatedAt: updatedOrder.updatedAt,
      items: updatedOrder.orderItems,
      user: updatedOrder.user,
      timestamp
    };
    
    // 응답 반환
    return new Response(
      JSON.stringify({
        success: true,
        message: '주문 상태가 업데이트되었습니다.',
        order: formattedOrder,
        timestamp
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Updated-At': Date.now().toString() // 추가 캐시 무효화 헤더
        }
      }
    );
  } catch (error) {
    console.error('주문 상태 업데이트 중 오류:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '주문 상태 업데이트 중 오류가 발생했습니다.',
        timestamp: Date.now()
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
} 
