import { hash } from 'bcrypt';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// 직접 PrismaClient 인스턴스 생성
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('회원가입 요청 데이터:', body);
    
    const { name, email, password, role, branchName } = body;

    // 필수 필드 검증
    if (!name || !email || !password) {
      console.log('필수 필드 누락:', { name, email, password: password ? '입력됨' : '누락' });
      return NextResponse.json(
        { error: '이름, 아이디, 비밀번호는 필수 항목입니다.' },
        { status: 400 }
      );
    }

    // 아이디 형식 검증 (이메일 형식이 아닌 일반 아이디)
    if (email.includes('@')) {
      console.log('잘못된 아이디 형식:', email);
      return NextResponse.json(
        { error: '아이디에는 @ 기호를 포함할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 아이디 형식 검증 (영문, 숫자만 허용)
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(email)) {
      console.log('잘못된 아이디 형식 (영문, 숫자만 허용):', email);
      return NextResponse.json(
        { error: '아이디는 영문과 숫자로만 구성되어야 합니다.' },
        { status: 400 }
      );
    }

    try {
      // 아이디 중복 확인
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        console.log('중복된 아이디:', email);
        return NextResponse.json(
          { error: '이미 등록된 아이디입니다.' },
          { status: 400 }
        );
      }
    } catch (findError) {
      console.error('사용자 조회 중 오류:', findError);
      return NextResponse.json(
        { error: '사용자 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    try {
      // 비밀번호 해싱
      const hashedPassword = await hash(password, 10);
      console.log('비밀번호 해싱 완료');

      // 사용자 생성
      console.log('사용자 생성 시도:', {
        name,
        email,
        role: role || 'BRANCH',
        branchName: role === 'BRANCH' ? branchName : null,
      });
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || 'BRANCH',
          branchName: role === 'BRANCH' ? branchName : null,
        },
      });

      console.log('사용자 생성 성공:', user.id);

      // 비밀번호 제외하고 응답
      const { password: _, ...userWithoutPassword } = user;

      return NextResponse.json(userWithoutPassword, { status: 201 });
    } catch (createError) {
      console.error('사용자 생성 중 오류:', createError);
      return NextResponse.json(
        { error: '사용자 생성 중 오류가 발생했습니다. 다시 시도해주세요.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('사용자 등록 오류:', error);
    return NextResponse.json(
      { error: '사용자 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 