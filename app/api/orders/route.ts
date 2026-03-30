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
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
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
    
    // 🔥 텔레그램 알림 전송 (개선된 에러 처리)
    try {
      console.log(`[주문생성] 텔레그램 알림 전송 시작 - 주문 ID: ${order.id}`);
      await sendNewOrderNotification(order);
      console.log(`[주문생성] 텔레그램 알림 전송 처리 완료 - 주문 ID: ${order.id}`);
    } catch (telegramError) {
      // 텔레그램 알림 실패는 주문 생성 성공에 영향을 주지 않음
      console.error(`[주문생성] 텔레그램 알림 전송 실패 - 주문 ID: ${order.id}:`, {
        error: telegramError instanceof Error ? telegramError.message : String(telegramError),
        stack: telegramError instanceof Error ? telegramError.stack : undefined
      });
    }
    
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
    // 요청 URL에서 검색 파라미터 추출
    const url = new URL(req.url);
    const month = url.searchParams.get('month');
    const showAll = url.searchParams.get('showAll') === 'true';
    const startDate = url.searchParams.get('startDate');
    const timestamp = url.searchParams.get('t') || Date.now().toString();
    
    console.log(`주문 목록 조회 요청 파라미터 (${timestamp}): { month: ${month}, showAll: ${showAll}, startDate: ${startDate} }`);
    
    // 세션 확인 - 세션이 없어도 조회 가능하도록 변경
    const session = await getServerSession(authOptions);
    
    // 데이터베이스 조회 조건 설정
    let whereCondition: any = {};
    
    // month 파라미터가 있는 경우 (YYYY-MM 형식)
    if (month) {
      // month 형식 검증 (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json(
          { success: false, error: '월 형식이 올바르지 않습니다. YYYY-MM 형식이어야 합니다.' },
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
      
      // 시작일과 종료일 설정
      let startMonth, endMonth;
      
      if (startDate) {
        // startDate가 제공된 경우, 해당 날짜부터 조회
        startMonth = new Date(startDate);
      } else {
        // startDate가 없으면 선택된 월의 첫날
        startMonth = new Date(`${month}-01T00:00:00Z`);
      }
      
      if (showAll) {
        // 전체 보기 모드: 시작일 이후의 모든 주문 조회 (종료일 없음)
        whereCondition.deliveryDate = {
          gte: startMonth
        };
      } else {
        // 월별 보기 모드: 해당 월의 주문만 조회
        const year = parseInt(month.split('-')[0]);
        const monthNum = parseInt(month.split('-')[1]);
        
        // 다음 달의 첫날 계산 (마지막 날 구하기 위함)
        const nextMonth = monthNum === 12 ? new Date(year + 1, 0, 1) : new Date(year, monthNum, 1);
        
        // 선택된 월의 첫날부터 마지막날까지
        whereCondition.deliveryDate = {
          gte: startMonth,
          lt: nextMonth
        };
      }
    }
    
    // 사용자 역할에 따른 조건 설정
    if (session?.user.role === 'BRANCH') {
      // 지점 사용자: 자신의 주문만 조회
      whereCondition.userId = session.user.id;
    }
    
    // 주문 데이터 조회 (기본적으로 최신 납품일자순으로 정렬)
    const orders = await prisma.order.findMany({
      where: whereCondition,
      orderBy: {
        deliveryDate: 'desc' // 내림차순 (최신 납품일자순)
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
    
    // 응답 데이터 구성
    const formattedOrders = orders.map(order => ({
      ...order,
      items: order.orderItems // orderItems를 items로 변환
    }));
    
    console.log(`주문 목록 조회 결과 (${timestamp}): ${formattedOrders.length}개 주문 조회됨`);
    
    // 캐시 방지 헤더와 함께 응답 반환
    return new Response(
      JSON.stringify({
        success: true,
        count: formattedOrders.length,
        filters: { month, showAll, startDate },
        orders: formattedOrders,
        timestamp
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } 
      }
    );
  } catch (error) {
    console.error('주문 목록 조회 중 오류:', error);
    
    return new Response(
      JSON.stringify({
        success: false, 
        error: error instanceof Error ? error.message : '주문 목록을 불러오는 중 오류가 발생했습니다.',
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