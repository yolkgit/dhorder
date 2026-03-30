import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient, Prisma } from '@prisma/client';

// PrismaClient 인스턴스 생성
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
}) as any; // 타입캐스팅을 통해 라인타임 오류 해결

// 품목 목록 조회 API
export async function GET(req: Request) {
  try {
    console.log('품목 목록 조회 시작');

    try {
      // 품목 목록 조회
      const items = await prisma.item.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      console.log(`품목 목록 조회 - ${items.length}개의 품목 조회됨`);

      // 응답 형식 통일
      return NextResponse.json({
        success: true,
        items: items,
        count: items.length
      });
    } catch (dbError) {
      console.error('품목 목록 조회 DB 오류:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: '품목 목록을 불러오는데 실패했습니다. DB 오류가 발생했습니다.',
          details: dbError instanceof Error ? dbError.message : String(dbError),
          items: []
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('품목 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      {
        success: false,
        error: '품목 목록을 불러오는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error),
        items: []
      },
      { status: 500 }
    );
  }
}

// 품목 추가 API
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('품목 추가 - 세션 정보:', JSON.stringify(session, null, 2));

    // 인증 확인
    if (!session || !session.user) {
      console.log('품목 추가 - 인증 실패');
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN') {
      console.log('품목 추가 - 권한 부족', session.user.role);
      return NextResponse.json(
        { error: '관리자만 품목을 추가할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱
    let data;
    try {
      data = await req.json();
      console.log('품목 추가 - 요청 데이터:', data);
    } catch (parseError) {
      console.error('품목 추가 - 요청 데이터 파싱 오류:', parseError);
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다' },
        { status: 400 }
      );
    }

    // 필수 필드 검증
    if (!data.name || data.name.trim() === '') {
      console.log('품목 추가 - 유효성 검증 실패: 품목명 누락');
      return NextResponse.json(
        { error: '품목명은 필수 입력 항목입니다' },
        { status: 400 }
      );
    }

    try {
      // 중복 품목 확인
      const existingItem = await prisma.item.findFirst({
        where: {
          name: data.name.trim()
        }
      });

      if (existingItem) {
        console.log('품목 추가 - 중복 품목:', data.name);
        return NextResponse.json(
          { error: '이미 존재하는 품목명입니다.' },
          { status: 400 }
        );
      }

      // 품목 생성
      const newItem = await prisma.item.create({
        data: {
          name: data.name.trim(),
          description: data.description ? data.description.trim() : null,
        },
      });

      console.log('품목 추가 성공:', newItem);

      return NextResponse.json({
        message: '품목이 성공적으로 추가되었습니다',
        item: newItem
      }, { status: 201 });
    } catch (dbError) {
      console.error('품목 추가 DB 오류:', dbError);

      // Prisma 오류 처리
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
        // 고유 제약 조건 위반 (중복 품목명)
        if (dbError.code === 'P2002') {
          return NextResponse.json(
            { error: '이미 존재하는 품목명입니다.' },
            { status: 400 }
          );
        }

        // 기타 Prisma 오류
        return NextResponse.json(
          {
            error: '품목 추가에 실패했습니다. DB 오류가 발생했습니다.',
            details: dbError.message,
            code: dbError.code
          },
          { status: 500 }
        );
      }

      // 기타 DB 오류
      return NextResponse.json(
        {
          error: '품목 추가에 실패했습니다. DB 오류가 발생했습니다.',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('품목 추가 중 오류 발생:', error);
    return NextResponse.json(
      {
        error: '품목 추가에 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 품목 수정 API
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('품목 수정 - 세션 정보:', JSON.stringify(session, null, 2));

    // 인증 확인
    if (!session || !session.user) {
      console.log('품목 수정 - 인증 실패');
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN') {
      console.log('품목 수정 - 권한 부족', session.user.role);
      return NextResponse.json(
        { error: '관리자만 품목을 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱
    let data;
    try {
      data = await req.json();
      console.log('품목 수정 - 요청 데이터:', data);
    } catch (parseError) {
      console.error('품목 수정 - 요청 데이터 파싱 오류:', parseError);
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다' },
        { status: 400 }
      );
    }

    // 필수 필드 검증
    if (!data.id || !data.name) {
      console.log('품목 수정 - 유효성 검증 실패: 필수 필드 누락');
      return NextResponse.json(
        { error: '품목 ID와 품목명은 필수 입력 항목입니다' },
        { status: 400 }
      );
    }

    try {
      // 품목 존재 여부 확인
      const existingItem = await prisma.item.findUnique({
        where: { id: data.id },
      });

      if (!existingItem) {
        console.log('품목 수정 - 품목을 찾을 수 없음:', data.id);
        return NextResponse.json(
          { error: '수정할 품목을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // 중복 품목명 확인 (자기 자신 제외)
      if (existingItem.name !== data.name) {
        const duplicateItem = await prisma.item.findFirst({
          where: {
            name: data.name,
            id: { not: data.id }
          }
        });

        if (duplicateItem) {
          console.log('품목 수정 - 중복 품목명:', data.name);
          return NextResponse.json(
            { error: '이미 존재하는 품목명입니다.' },
            { status: 400 }
          );
        }
      }

      // 품목 수정
      const updatedItem = await prisma.item.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description || null,
        },
      });

      console.log('품목 수정 성공:', updatedItem);

      return NextResponse.json({
        success: true,
        message: '품목이 성공적으로 수정되었습니다',
        item: updatedItem
      });
    } catch (dbError) {
      console.error('품목 수정 DB 오류:', dbError);

      // Prisma 오류 처리
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
        // 고유 제약 조건 위반 (중복 품목명)
        if (dbError.code === 'P2002') {
          return NextResponse.json(
            { error: '이미 존재하는 품목명입니다.' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { 
          success: false,
          error: '품목 수정에 실패했습니다. DB 오류가 발생했습니다.',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('품목 수정 중 오류 발생:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '품목 수정에 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 품목 삭제 API
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('품목 삭제 - 세션 정보:', JSON.stringify(session, null, 2));

    // 인증 확인
    if (!session || !session.user) {
      console.log('품목 삭제 - 인증 실패');
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN') {
      console.log('품목 삭제 - 권한 부족', session.user.role);
      return NextResponse.json(
        { error: '관리자만 품목을 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // URL에서 품목 ID 추출
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      console.log('품목 삭제 - 품목 ID 누락');
      return NextResponse.json(
        { error: '삭제할 품목의 ID가 필요합니다' },
        { status: 400 }
      );
    }

    try {
      // 품목 존재 여부 확인
      const existingItem = await prisma.item.findUnique({
        where: { id },
      });

      if (!existingItem) {
        console.log('품목 삭제 - 품목을 찾을 수 없음:', id);
        return NextResponse.json(
          { error: '삭제할 품목을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // 주문 항목에서 사용 중인지 확인
      const orderItemCount = await prisma.orderItem.count({
        where: {
          itemName: existingItem.name,
        },
      });

      if (orderItemCount > 0) {
        console.log('품목 삭제 - 주문에서 사용 중:', id, orderItemCount);
        return NextResponse.json(
          {
            error: '이 품목은 주문에서 사용 중이므로 삭제할 수 없습니다.',
            usageCount: orderItemCount
          },
          { status: 400 }
        );
      }

      // 품목 삭제
      await prisma.item.delete({
        where: { id },
      });

      console.log('품목 삭제 성공:', id);

      return NextResponse.json({
        success: true,
        message: '품목이 성공적으로 삭제되었습니다'
      });
    } catch (dbError) {
      console.error('품목 삭제 DB 오류:', dbError);
      return NextResponse.json(
        { 
          success: false,
          error: '품목 삭제에 실패했습니다. DB 오류가 발생했습니다.',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('품목 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '품목 삭제에 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 