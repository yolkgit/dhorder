import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';
import { sendNewOrderNotification } from '@/lib/telegram';

// 주문 생성 API
export async function POST(req: Request) {
  try {
    // 세션 정보 확인
    const session = await getServerSession(authOptions);
    console.log('세션 정보:', JSON.stringify(session, null, 2));

    // 인증 확인
    if (!session) {
      console.log('인증 실패: 세션 없음');
      
      const errorResponse = JSON.stringify({
        success: false,
        error: '인증이 필요합니다. 세션이 없습니다.',
        action: 'relogin'
      });
      
      return new Response(errorResponse, { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    if (!session.user) {
      console.log('인증 실패: 사용자 정보 없음');
      
      const errorResponse = JSON.stringify({
        success: false,
        error: '인증이 필요합니다. 사용자 정보가 없습니다.',
        action: 'relogin'
      });
      
      return new Response(errorResponse, { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // 사용자 ID 확인
    if (!session.user.id) {
      console.log('인증 실패: 사용자 ID 없음');
      
      const errorResponse = JSON.stringify({
        success: false,
        error: '사용자 정보를 찾을 수 없습니다. ID가 없습니다.',
        action: 'relogin'
      });
      
      return new Response(errorResponse, { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // 사용자 존재 여부 확인
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      console.log('인증 실패: 데이터베이스에 사용자 없음', session.user.id);
      
      // 데이터베이스의 모든 사용자 조회
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, role: true }
      });
      console.log('데이터베이스의 모든 사용자:', allUsers);
      
      const errorResponse = JSON.stringify({
        success: false,
        error: '사용자 정보를 찾을 수 없습니다. 데이터베이스에 사용자가 없습니다.',
        sessionUserId: session.user.id,
        availableUsers: allUsers.length,
        action: 'relogin'
      });
      
      return new Response(errorResponse, { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    console.log('인증된 사용자:', user);

    // 요청 본문 파싱
    let requestBody;
    try {
      const text = await req.text();
      console.log('요청 본문 텍스트:', text);
      requestBody = text ? JSON.parse(text) : {};
      console.log('파싱된 요청 본문:', requestBody);
    } catch (parseError) {
      console.error('요청 본문 파싱 오류:', parseError);
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }

    const { 
      deliveryDate, 
      arrivalTime, 
      destination, 
      address, 
      phoneNumber, 
      memo, 
      orderItems 
    } = requestBody;

    console.log('주문 데이터:', { 
      userId: session.user.id,
      deliveryDate, 
      arrivalTime, 
      destination, 
      address, 
      phoneNumber, 
      memo, 
      orderItems 
    });

    // 필수 필드 검증
    if (!deliveryDate) {
      const errorResponse = JSON.stringify({
        success: false,
        error: '납품일자를 입력해주세요.'
      });
      
      return new Response(errorResponse, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
    
    if (!arrivalTime) {
      const errorResponse = JSON.stringify({
        success: false,
        error: '도착시간을 입력해주세요.'
      });
      
      return new Response(errorResponse, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
    
    if (!destination) {
      const errorResponse = JSON.stringify({
        success: false,
        error: '하차지를 입력해주세요.'
      });
      
      return new Response(errorResponse, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
    
    if (!address) {
      const errorResponse = JSON.stringify({
        success: false,
        error: '주소를 입력해주세요.'
      });
      
      return new Response(errorResponse, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
    
    if (!phoneNumber) {
      const errorResponse = JSON.stringify({
        success: false,
        error: '전화번호를 입력해주세요.'
      });
      
      return new Response(errorResponse, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
    
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      const errorResponse = JSON.stringify({
        success: false,
        error: '최소 하나의 주문 항목이 필요합니다.'
      });
      
      return new Response(errorResponse, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // 주문 항목 검증
    for (const item of orderItems) {
      if (!item.itemName || item.itemName.trim() === '') {
        const errorResponse = JSON.stringify({
          success: false,
          error: '모든 주문 항목에 품목명을 입력해주세요.'
        });
        
        return new Response(errorResponse, { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }
      
      if (!item.quantity || item.quantity < 1) {
        const errorResponse = JSON.stringify({
          success: false,
          error: '모든 주문 항목의 수량은 1 이상이어야 합니다.'
        });
        
        return new Response(errorResponse, { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }
    }

    // 날짜 형식 검증
    let parsedDate;
    try {
      parsedDate = new Date(deliveryDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('유효하지 않은 날짜 형식');
      }
    } catch (dateError) {
      console.error('날짜 파싱 오류:', dateError);
      
      const errorResponse = JSON.stringify({
        success: false,
        error: '유효하지 않은 납품일자 형식입니다.'
      });
      
      return new Response(errorResponse, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // 주문 생성
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        deliveryDate: new Date(deliveryDate),
        arrivalTime,
        destination,
        address,
        phoneNumber,
        memo,
        status: 'RECEIVED',
        orderItems: {
          create: orderItems.map(item => ({
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: item.quantity
          }))
        }
      },
      include: {
        orderItems: true,
        user: {
          select: {
            name: true,
            branchName: true
          }
        }
      }
    });

    console.log('주문 생성 성공:', order.id);
    
    // 텔레그램 알림 전송 (비동기로 처리하여 응답 지연 방지)
    sendNewOrderNotification(order).catch(error => {
      console.error('텔레그램 알림 전송 실패:', error);
    });
    
    // 성공 응답
    const successResponse = JSON.stringify({
      success: true,
      message: '주문이 성공적으로 생성되었습니다.',
      order: order
    });
    
    return new Response(successResponse, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('주문 생성 오류:', error);
    
    const errorResponse = JSON.stringify({
      success: false,
      error: '주문 생성 중 오류가 발생했습니다.', 
      details: (error as Error).message 
    });
    
    return new Response(errorResponse, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

// 주문 목록 조회 API
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('주문 목록 조회 - 세션 정보:', JSON.stringify(session, null, 2));

    // 인증 확인
    if (!session || !session.user) {
      console.log('주문 목록 조회 - 인증 실패');
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    console.log('주문 목록 조회 - 요청 월:', month);

    // 월별 필터링을 위한 조건 설정
    let dateFilter = {};
    if (month) {
      try {
        // 월 형식 검증 (YYYY-MM)
        if (!/^\d{4}-\d{2}$/.test(month)) {
          console.error('주문 목록 조회 - 유효하지 않은 월 형식:', month);
          return NextResponse.json(
            { error: '유효하지 않은 월 형식입니다. YYYY-MM 형식이어야 합니다.' },
            { status: 400 }
          );
        }
        
        // 월의 시작일과 마지막일 계산
        const [year, monthNum] = month.split('-').map(num => parseInt(num));
        
        // 월의 첫날 (1일)
        const startDate = new Date(year, monthNum - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        
        // 다음 달의 첫날 - 1밀리초 (현재 월의 마지막 날)
        const endDate = new Date(year, monthNum, 0);
        endDate.setHours(23, 59, 59, 999);

        dateFilter = {
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
        };
        console.log('주문 목록 조회 - 월별 필터:', JSON.stringify({
          month: month,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }, null, 2));
      } catch (dateError) {
        console.error('주문 목록 조회 - 월 파싱 오류:', dateError);
        return NextResponse.json(
          { error: '월 형식이 올바르지 않습니다.' },
          { status: 400 }
        );
      }
    } else {
      console.log('주문 목록 조회 - 월 필터 없음, 모든 주문 조회');
    }

    // 사용자 역할에 따른 조회 조건 설정
    let whereCondition: any = {
      ...dateFilter,
    };

    // 지점 사용자인 경우 자신의 주문만 조회
    if (session.user.role === 'BRANCH') {
      whereCondition.userId = session.user.id;
      console.log('주문 목록 조회 - 지점 사용자 필터 적용:', session.user.id);
    } else {
      console.log('주문 목록 조회 - 관리자 사용자, 모든 주문 조회');
    }

    console.log('주문 목록 조회 - 최종 쿼리 조건:', JSON.stringify(whereCondition, null, 2));

    // 주문 목록 조회
    const orders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        orderItems: true,
        user: {
          select: {
            name: true,
            branchName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`주문 목록 조회 - 결과: ${orders.length}개의 주문 조회됨`);
    
    // 각 주문의 ID 로깅
    orders.forEach((order, index) => {
      console.log(`주문 ${index + 1}: ID=${order.id}, 날짜=${order.deliveryDate}, 하차지=${order.destination}`);
    });
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      count: orders.length,
      orders: orders
    };
    
    // 응답 데이터 로깅
    try {
      const jsonResponse = JSON.stringify(responseData);
      console.log('주문 목록 조회 - 응답 데이터 크기:', jsonResponse.length);
      
      // 응답 데이터 구조 로깅
      console.log('주문 목록 조회 - 응답 데이터 구조:', 
        JSON.stringify({
          type: 'object',
          success: responseData.success,
          count: responseData.count,
          ordersType: Array.isArray(responseData.orders) ? 'array' : typeof responseData.orders
        })
      );
    } catch (stringifyError) {
      console.error('주문 목록 조회 - 응답 데이터 로깅 오류:', stringifyError);
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '주문 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 