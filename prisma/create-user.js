const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcrypt');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('데이터베이스 연결 시도...');
    await prisma.$connect();
    console.log('데이터베이스 연결 성공');

    // 테스트 사용자 생성
    const hashedPassword = await hash('password123', 10);
    console.log('비밀번호 해싱 완료');

    const userData = {
      name: '테스트 사용자',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'BRANCH',
      branchName: '테스트 지점',
    };

    console.log('사용자 생성 시도:', {
      ...userData,
      password: '(해시된 비밀번호)',
    });

    // 기존 사용자 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log('이미 존재하는 사용자입니다:', existingUser.email);
      return;
    }

    // 사용자 생성
    const user = await prisma.user.create({
      data: userData,
    });

    console.log('사용자 생성 성공:', user);
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
    console.log('데이터베이스 연결 종료');
  }
}

main(); 