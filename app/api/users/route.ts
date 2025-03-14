import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcrypt';

// 회원 목록 조회 API
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('회원 목록 조회 - 세션 정보:', JSON.stringify(session, null, 2));

    // 인증 확인
    if (!session || !session.user) {
      console.log('회원 목록 조회 - 인증 실패');
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN') {
      console.log('회원 목록 조회 - 권한 부족:', session.user.role);
      return NextResponse.json(
        { error: '관리자만 회원 목록을 조회할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 회원 목록 조회 (비밀번호 제외)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchName: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`회원 목록 조회 - ${users.length}명의 회원 조회됨`);
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('회원 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '회원 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 회원 추가 API
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 인증 확인
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자만 회원을 추가할 수 있습니다.' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { name, email, password, role, branchName } = data;

    // 필수 필드 검증
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '이름, 아이디, 비밀번호는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 아이디 형식 검증 (영문, 숫자만 허용)
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(email)) {
      return NextResponse.json(
        { error: '아이디는 영문과 숫자로만 구성되어야 합니다.' },
        { status: 400 }
      );
    }

    // 아이디 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 등록된 아이디입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await hash(password, 10);

    // role 값 검증 및 기본값 설정
    let validRole = role;
    if (role !== 'ADMIN' && role !== 'BRANCH') {
      validRole = 'BRANCH'; // 유효하지 않은 role이 전달되면 BRANCH로 설정
    }

    // 회원 생성
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: validRole,
        branchName: branchName || null,
      },
    });

    // 비밀번호 제외하고 반환
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json({ 
      success: true, 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('회원 추가 중 오류 발생:', error);
    return NextResponse.json(
      { error: '회원 추가에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 회원 수정 API
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 인증 확인
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자만 회원 정보를 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { id, name, email, password, role, branchName } = data;

    // 필수 필드 검증
    if (!id || !name || !email) {
      return NextResponse.json(
        { error: '회원 ID, 이름, 아이디는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 아이디 형식 검증 (영문, 숫자만 허용)
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(email)) {
      return NextResponse.json(
        { error: '아이디는 영문과 숫자로만 구성되어야 합니다.' },
        { status: 400 }
      );
    }

    // 회원 존재 여부 확인
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: '존재하지 않는 회원입니다.' },
        { status: 404 }
      );
    }

    // 아이디 중복 확인 (다른 사용자와 중복되는지)
    if (email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (duplicateEmail) {
        return NextResponse.json(
          { error: '이미 등록된 아이디입니다.' },
          { status: 400 }
        );
      }
    }

    // role 값 검증
    let validRole = role;
    if (role !== 'ADMIN' && role !== 'BRANCH') {
      validRole = 'BRANCH'; // 유효하지 않은 role이 전달되면 BRANCH로 설정
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      name,
      email,
      role: validRole,
      branchName: branchName || existingUser.branchName,
    };

    // 비밀번호가 제공된 경우에만 해싱하여 업데이트
    if (password) {
      updateData.password = await hash(password, 10);
    }

    // 회원 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // 비밀번호 제외하고 반환
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    return NextResponse.json({ 
      success: true, 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('회원 수정 중 오류 발생:', error);
    return NextResponse.json(
      { error: '회원 정보 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 회원 삭제 API
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 인증 확인
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자만 회원을 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    // URL에서 회원 ID 추출
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '회원 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 회원 존재 여부 확인
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: '존재하지 않는 회원입니다.' },
        { status: 404 }
      );
    }

    // 자기 자신을 삭제하려는 경우 방지
    if (id === session.user.id) {
      return NextResponse.json(
        { error: '자기 자신을 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 회원이 작성한 주문이 있는지 확인
    const orderCount = await prisma.order.count({
      where: { userId: id },
    });

    if (orderCount > 0) {
      return NextResponse.json(
        { 
          error: '이 회원이 작성한 주문이 있어 삭제할 수 없습니다.', 
          orderCount 
        },
        { status: 400 }
      );
    }

    // 회원 삭제
    await prisma.user.delete({
      where: { id },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: '회원이 성공적으로 삭제되었습니다.' 
    });
  } catch (error) {
    console.error('회원 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '회원 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
} 